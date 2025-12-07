import { NextResponse, type NextRequest } from "next/server"
import { requireUser } from "@/server/auth"
import { optionsResponse, parseJson, serverError, withCors } from "@/server/http"
import { ensureItemOwnership } from "@/server/items"
import { drawingSchema } from "@/server/schemas"
import { supabase } from "@/server/supabase"
import type { DrawingRecord } from "@/server/types"

export const runtime = "nodejs"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireUser(req)
  if ("response" in auth) return auth.response

  const parsed = await parseJson(req, drawingSchema)
  if (!parsed.success) return parsed.response

  const item = await ensureItemOwnership(params.id, auth.userId)
  if (item instanceof NextResponse) return item

  const payload = {
    id: parsed.data.id,
    item_id: item.id,
    blob_ref: parsed.data.blobRef,
    bounds_json: parsed.data.bounds ?? null,
  }

  const { data, error } = await supabase
    .from("drawings")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single()

  if (error || !data) {
    console.error("[api/items/:id/drawings] Failed to upsert drawing", error)
    return serverError("Failed to save drawing")
  }

  return withCors(NextResponse.json({ drawing: data as DrawingRecord }))
}

export function OPTIONS() {
  return optionsResponse()
}
