import { NextResponse, type NextRequest } from "next/server"
import { requireUser } from "@/server/auth"
import { optionsResponse, parseJson, serverError, withCors } from "@/server/http"
import { determineGroupForItem } from "@/server/grouping"
import { itemCreateSchema } from "@/server/schemas"
import { supabase } from "@/server/supabase"
import type { ItemRecord } from "@/server/types"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const auth = requireUser(req)
  if ("response" in auth) return auth.response

  const parsed = await parseJson(req, itemCreateSchema)
  if (!parsed.success) return parsed.response

  const { pageUrl, title } = parsed.data
  const { data: existingItem, error: existingError } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("page_url", pageUrl)
    .maybeSingle()

  if (existingError) {
    console.error("[api/items] Failed to look up existing item", existingError)
  }

  let groupId = existingItem?.group_id ?? null
  if (!groupId) {
    groupId = await determineGroupForItem({
      userId: auth.userId,
      title: title ?? existingItem?.title ?? null,
      pageUrl,
    })
  }

  const { data, error } = await supabase
    .from("items")
    .upsert(
      {
        user_id: auth.userId,
        page_url: pageUrl,
        title: title ?? null,
        group_id: groupId,
      },
      { onConflict: "user_id,page_url" },
    )
    .select()
    .single()

  if (error || !data) {
    console.error("[api/items] Failed to upsert item", error)
    return serverError("Failed to save item")
  }

  if (groupId) {
    const { error: touchGroupError } = await supabase
      .from("item_groups")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", groupId)
      .eq("user_id", auth.userId)

    if (touchGroupError) {
      console.error("[api/items] Failed to bump group timestamp", touchGroupError)
    }
  }

  return withCors(NextResponse.json({ item: data as ItemRecord }))
}

export function OPTIONS() {
  return optionsResponse()
}
