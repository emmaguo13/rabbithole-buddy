import { NextResponse, type NextRequest } from "next/server"
import { requireUser } from "@/server/auth"
import { optionsResponse, parseJson, serverError, withCors } from "@/server/http"
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

  const { data, error } = await supabase
    .from("items")
    .upsert(
      { user_id: auth.userId, page_url: pageUrl, title: title ?? null },
      { onConflict: "user_id,page_url" },
    )
    .select()
    .single()

  if (error || !data) {
    console.error("[api/items] Failed to upsert item", error)
    return serverError("Failed to save item")
  }

  return withCors(NextResponse.json({ item: data as ItemRecord }))
}

export function OPTIONS() {
  return optionsResponse()
}
