import { NextResponse, type NextRequest } from "next/server"
import { requireUser } from "@/server/auth"
import { optionsResponse, parseJson, serverError, withCors } from "@/server/http"
import { ensureItemOwnership } from "@/server/items"
import { noteSchema } from "@/server/schemas"
import { supabase } from "@/server/supabase"
import type { NoteRecord } from "@/server/types"

export const runtime = "nodejs"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireUser(req)
  if ("response" in auth) return auth.response

  const parsed = await parseJson(req, noteSchema)
  if (!parsed.success) return parsed.response

  const item = await ensureItemOwnership(params.id, auth.userId)
  if (item instanceof NextResponse) return item

  const payload = {
    id: parsed.data.id,
    item_id: item.id,
    content: parsed.data.content ?? null,
    position_json: parsed.data.position ?? null,
    rects_json: parsed.data.rects ?? null,
  }

  const { data, error } = await supabase
    .from("notes")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single()

  if (error || !data) {
    console.error("[api/items/:id/notes] Failed to upsert note", error)
    return serverError("Failed to save note")
  }

  return withCors(NextResponse.json({ note: data as NoteRecord }))
}

export function OPTIONS() {
  return optionsResponse()
}
