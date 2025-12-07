import { z } from "zod"
import { ENV } from "./env"
import { supabase } from "./supabase"

type UserContext = {
  groups: Array<{ id: string; label: string; summary: string | null }>
  items: Array<{
    id: string
    title: string | null
    page_url: string
    group_label: string | null
    note_snippets: string[]
  }>
}

export type Recommendation = {
  title: string
  summary: string
  suggested_query: string
}

const recommendationSchema = z.object({
  recommendations: z
    .array(
      z.object({
        title: z.string().max(120),
        summary: z.string().max(300),
        suggested_query: z.string().max(160),
      }),
    )
    .max(8),
})

const GROK_API_URL = "https://api.x.ai/v1/chat/completions"
const GROK_MODEL = "grok-3"

export async function generateRecommendations(userId: string): Promise<{
  recommendations: Recommendation[]
  message?: string
}> {
  if (!ENV.XAI_API_KEY) {
    return { recommendations: [], message: "Recommendations disabled: missing XAI_API_KEY." }
  }

  const context = await loadUserContext(userId)
  if (!context) {
    return { recommendations: [], message: "Could not load user context." }
  }

  if (!context.items.length) {
    return { recommendations: [], message: "No saved items yet." }
  }

  const prompt = {
    groups: context.groups,
    items: context.items,
    instructions: {
      goal:
        "Recommend fresh reading topics or searches based on the user's saved pages, groups, and notes.",
      format: "{ recommendations: [{ title, summary, suggested_query }] }",
      guardrails:
        "Do not invent full URLs. Use short titles and suggest a search query the user can try.",
    },
  }

  try {
    const response = await fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a reading guide. Suggest concise reading ideas that build on the user's saved pages, groups, and notes. Respond only with JSON.",
          },
          { role: "user", content: JSON.stringify(prompt) },
        ],
      }),
    })

    if (!response.ok) {
      console.error("[recommendations] Grok request failed", await response.text())
      return { recommendations: [], message: "Recommendation model unavailable." }
    }

    const completion = await response.json()
    const content = completion?.choices?.[0]?.message?.content
    if (!content || typeof content !== "string") {
      console.error("[recommendations] Empty completion", completion)
      return { recommendations: [], message: "Recommendation model returned no content." }
    }

    const parsed = recommendationSchema.safeParse(JSON.parse(content))
    if (!parsed.success) {
      console.error("[recommendations] Invalid completion", parsed.error)
      return { recommendations: [], message: "Recommendation model returned invalid data." }
    }

    return { recommendations: parsed.data.recommendations }
  } catch (error) {
    console.error("[recommendations] Grok request threw", error)
    return { recommendations: [], message: "Recommendation request failed." }
  }
}

async function loadUserContext(userId: string): Promise<UserContext | null> {
  const [groupsRes, itemsRes] = await Promise.all([
    supabase
      .from("item_groups")
      .select("id,label,summary")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("items")
      .select("id,title,page_url,group_id,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(40),
  ])

  if (groupsRes.error || itemsRes.error) {
    console.error("[recommendations] Failed to load data", { groupsError: groupsRes.error, itemsError: itemsRes.error })
    return null
  }

  const groups = groupsRes.data ?? []
  const groupMap = new Map(groups.map((g) => [g.id, g.label]))
  const items = itemsRes.data ?? []
  const itemIds = items.map((i) => i.id)

  const notesRes = await supabase
    .from("notes")
    .select("item_id,content")
    .in("item_id", itemIds)
    .order("updated_at", { ascending: false })
    .limit(120)

  if (notesRes.error) {
    console.error("[recommendations] Failed to load notes", notesRes.error)
  }

  const noteMap = (notesRes.data ?? []).reduce<Record<string, string[]>>((acc, note) => {
    if (!note.content) return acc
    acc[note.item_id] = acc[note.item_id] ?? []
    if (acc[note.item_id].length < 3) {
      acc[note.item_id].push(truncate(note.content, 180))
    }
    return acc
  }, {})

  return {
    groups: groups.map((g) => ({ id: g.id, label: g.label, summary: g.summary })),
    items: items.map((item) => ({
      id: item.id,
      title: truncate(item.title ?? "", 120),
      page_url: item.page_url,
      group_label: item.group_id ? groupMap.get(item.group_id) ?? null : null,
      note_snippets: noteMap[item.id] ?? [],
    })),
  }
}

function truncate(value: string, max: number): string {
  if (!value) return value
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}
