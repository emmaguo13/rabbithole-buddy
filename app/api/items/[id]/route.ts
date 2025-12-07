import { NextResponse, type NextRequest } from "next/server"
import { requireUser } from "@/server/auth"
import { optionsResponse, parseJson, serverError, withCors } from "@/server/http"
import { ensureItemOwnership } from "@/server/items"
import { itemUpdateSchema } from "@/server/schemas"
import { supabase } from "@/server/supabase"
import type { DrawingRecord, HighlightRecord, ItemRecord, NoteRecord } from "@/server/types"

export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireUser(req)
  if ("response" in auth) return auth.response

  const item = await ensureItemOwnership(params.id, auth.userId)
  if (item instanceof NextResponse) return item

  const [notesRes, highlightsRes, drawingsRes] = await Promise.all([
    supabase.from("notes").select("*").eq("item_id", item.id),
    supabase.from("highlights").select("*").eq("item_id", item.id),
    supabase.from("drawings").select("*").eq("item_id", item.id),
  ])

  if (notesRes.error || highlightsRes.error || drawingsRes.error) {
    console.error("[api/items/:id] Failed to load relations", {
      notesError: notesRes.error,
      highlightsError: highlightsRes.error,
      drawingsError: drawingsRes.error,
    })
    return serverError("Failed to load item")
  }

  return withCors(
    NextResponse.json({
      item: item as ItemRecord,
      notes: (notesRes.data ?? []) as NoteRecord[],
      highlights: (highlightsRes.data ?? []) as HighlightRecord[],
      drawings: (drawingsRes.data ?? []) as DrawingRecord[],
    }),
  )
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireUser(req)
  if ("response" in auth) return auth.response

  const parsed = await parseJson(req, itemUpdateSchema)
  if (!parsed.success) return parsed.response

  const item = await ensureItemOwnership(params.id, auth.userId)
  if (item instanceof NextResponse) return item

  const { data, error } = await supabase
    .from("items")
    .update({ title: parsed.data.title ?? null })
    .eq("id", item.id)
    .eq("user_id", auth.userId)
    .select()
    .single()

  if (error || !data) {
    console.error("[api/items/:id] Failed to update item", error)
    return serverError("Failed to update item")
  }

  return withCors(NextResponse.json({ item: data as ItemRecord }))
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireUser(req)
  if ("response" in auth) return auth.response

  const item = await ensureItemOwnership(params.id, auth.userId)
  if (item instanceof NextResponse) return item

  const { error } = await supabase.from("items").delete().eq("id", item.id).eq("user_id", auth.userId)
  if (error) {
    console.error("[api/items/:id] Failed to delete item", error)
    return serverError("Failed to delete item")
  }

  return withCors(NextResponse.json({ success: true }))
}

export function OPTIONS() {
  return optionsResponse()
}
