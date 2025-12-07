import { z } from "zod"
import { ENV } from "./env"
import { supabase } from "./supabase"
import type { ItemGroupRecord, ItemRecord } from "./types"

type GroupingContext = {
  userId: string
  title: string | null
  pageUrl: string
}

type GroupingSuggestion = {
  action: "assign" | "create"
  target_group_id?: string
  label?: string
  summary?: string
}

const suggestionSchema = z.object({
  action: z.enum(["assign", "create"]),
  target_group_id: z.string().uuid().optional(),
  label: z.string().min(1).max(120).optional(),
  summary: z.string().max(500).optional(),
  reason: z.string().optional(),
})

const GROK_API_URL = "https://api.x.ai/v1/chat/completions"
const GROK_MODEL = "grok-3"

export async function determineGroupForItem(context: GroupingContext): Promise<string | null> {
  if (!ENV.XAI_API_KEY) {
    return null
  }

  const [groupsRes, groupedItemsRes] = await Promise.all([
    supabase
      .from("item_groups")
      .select("id,label,summary")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("items")
      .select("id,title,page_url,group_id")
      .eq("user_id", context.userId)
      .not("group_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(60),
  ])

  if (groupsRes.error || groupedItemsRes.error) {
    console.error("[grouping] Failed to load existing groups", {
      groupsError: groupsRes.error,
      itemsError: groupedItemsRes.error,
    })
    return null
  }

  const groups = (groupsRes.data ?? []) as ItemGroupRecord[]

  const groupedItems = (groupedItemsRes.data ?? []).reduce<Record<string, ItemRecord[]>>(
    (acc, item) => {
      const key = (item as ItemRecord).group_id
      if (!key) return acc
      acc[key] = acc[key] ?? []
      acc[key].push(item as ItemRecord)
      return acc
    },
    {},
  )

  const compactGroups = groups.map((group) => ({
    id: group.id,
    label: group.label,
    summary: group.summary,
    items: (groupedItems[group.id] ?? []).slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      page_url: item.page_url,
    })),
  }))

  const suggestion = await requestGroupingSuggestion(context, compactGroups)
  if (!suggestion) {
    return groups.length
      ? null
      : await createGroup(context, { label: deriveFallbackLabel(context), summary: null })
  }

  if (suggestion.action === "assign") {
    const matchFromId = suggestion.target_group_id
      ? groups.find((group) => group.id === suggestion.target_group_id)
      : null
    if (matchFromId) {
      return matchFromId.id
    }

    if (suggestion.label) {
      const matchFromLabel = groups.find(
        (group) => group.label.toLowerCase() === suggestion.label?.toLowerCase(),
      )
      if (matchFromLabel) return matchFromLabel.id
    }
  }

  if (suggestion.action === "create" && suggestion.label) {
    return await createGroup(context, { label: suggestion.label, summary: suggestion.summary ?? null })
  }

  if (!groups.length) {
    return await createGroup(context, { label: deriveFallbackLabel(context), summary: null })
  }

  return null
}

async function requestGroupingSuggestion(
  context: GroupingContext,
  groups: Array<{
    id: string
    label: string
    summary: string | null
    items: Array<{ id: string; title: string | null; page_url: string }>
  }>,
): Promise<GroupingSuggestion | null> {
  try {
    const response = await fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You organize saved web pages into concise topical groups. " +
              "Pick an existing group when it clearly fits; otherwise propose a short new label. " +
              "Respond only with JSON.",
          },
          {
            role: "user",
            content: JSON.stringify({
              item: {
                title: context.title,
                pageUrl: context.pageUrl,
              },
              existingGroups: groups,
              instructions: {
                format:
                  "{ action: 'assign' | 'create', target_group_id?: uuid, label?: string, summary?: string }",
                goal: "Prefer reuse; create only when no close match.",
              },
            }),
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error("[grouping] Grok request failed", await response.text())
      return null
    }

    const completion = await response.json()
    const content = completion?.choices?.[0]?.message?.content
    if (!content || typeof content !== "string") {
      console.error("[grouping] Grok returned no content", completion)
      return null
    }

    const parsed = suggestionSchema.safeParse(JSON.parse(content))
    if (!parsed.success) {
      console.error("[grouping] Grok suggestion invalid", parsed.error)
      return null
    }

    const suggestion = parsed.data
    return {
      action: suggestion.action,
      target_group_id: suggestion.target_group_id,
      label: suggestion.label,
      summary: suggestion.summary,
    }
  } catch (error) {
    console.error("[grouping] Grok request threw", error)
    return null
  }
}

async function createGroup(
  context: GroupingContext,
  proposal: { label: string; summary: string | null },
): Promise<string | null> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("item_groups")
    .upsert(
      {
        user_id: context.userId,
        label: proposal.label,
        summary: proposal.summary,
        updated_at: now,
      },
      { onConflict: "user_id,label" },
    )
    .select("id")
    .single()

  if (error || !data) {
    console.error("[grouping] Failed to create item group", error)
    return null
  }

  return data.id as string
}

function deriveFallbackLabel(context: GroupingContext): string {
  if (context.title) {
    return context.title.slice(0, 100)
  }
  try {
    const url = new URL(context.pageUrl)
    return url.hostname
  } catch {
    return "General"
  }
}
