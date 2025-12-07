import { NextResponse, type NextRequest } from "next/server"
import { requireUser } from "@/server/auth"
import { parseJson, serverError } from "@/server/http"
import { ensureItemOwnership } from "@/server/items"
import { highlightSchema } from "@/server/schemas"
import { supabase } from "@/server/supabase"
import type { HighlightRecord } from "@/server/types"

export const runtime = "nodejs"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireUser(req)
  if ("response" in auth) return auth.response

  const parsed = await parseJson(req, highlightSchema)
  if (!parsed.success) return parsed.response

  const item = await ensureItemOwnership(params.id, auth.userId)
  if (item instanceof NextResponse) return item

  const payload = {
    id: parsed.data.id,
    item_id: item.id,
    text: parsed.data.text ?? null,
    rects_json: parsed.data.rects ?? null,
  }

  const { data, error } = await supabase
    .from("highlights")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single()

  if (error || !data) {
    console.error("[api/items/:id/highlights] Failed to upsert highlight", error)
    return serverError("Failed to save highlight")
  }

  return NextResponse.json({ highlight: data as HighlightRecord })
}
