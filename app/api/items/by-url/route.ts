import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/server/auth"
import { optionsResponse, serverError, withCors } from "@/server/http"
import { supabase } from "@/server/supabase"
import type { DrawingRecord, HighlightRecord, ItemRecord, NoteRecord } from "@/server/types"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const auth = requireUser(req)
  if ("response" in auth) return auth.response

  const url = req.nextUrl.searchParams.get("url")
  if (!url) {
    return withCors(NextResponse.json({ error: "Missing url param" }, { status: 400 }))
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("page_url", url)
    .maybeSingle()

  if (itemError) {
    console.error("[api/items/by-url] Failed to fetch item", itemError)
    return serverError("Failed to load item")
  }

  if (!item) {
    return withCors(NextResponse.json({ error: "Item not found" }, { status: 404 }))
  }

  const [notesRes, highlightsRes, drawingsRes] = await Promise.all([
    supabase.from("notes").select("*").eq("item_id", item.id),
    supabase.from("highlights").select("*").eq("item_id", item.id),
    supabase.from("drawings").select("*").eq("item_id", item.id),
  ])

  if (notesRes.error || highlightsRes.error || drawingsRes.error) {
    console.error("[api/items/by-url] Failed to load relations", {
      notesError: notesRes.error,
      highlightsError: highlightsRes.error,
      drawingsError: drawingsRes.error,
    })
    return serverError("Failed to load item relations")
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

export function OPTIONS() {
  return optionsResponse()
}
