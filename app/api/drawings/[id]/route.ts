import { NextResponse, type NextRequest } from "next/server"
import { requireUser } from "@/server/auth"
import { optionsResponse, serverError, withCors } from "@/server/http"
import { ensureItemOwnership } from "@/server/items"
import { supabase } from "@/server/supabase"

export const runtime = "nodejs"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireUser(req)
  if ("response" in auth) return auth.response

  const { data: drawing, error } = await supabase
    .from("drawings")
    .select("id, item_id")
    .eq("id", params.id)
    .single()

  if (error || !drawing) {
    return withCors(NextResponse.json({ error: "Drawing not found" }, { status: 404 }))
  }

  const owner = await ensureItemOwnership(drawing.item_id, auth.userId)
  if (owner instanceof NextResponse) return owner

  const { error: deleteError } = await supabase.from("drawings").delete().eq("id", params.id)
  if (deleteError) {
    console.error("[api/drawings/:id] Failed to delete drawing", deleteError)
    return serverError("Failed to delete drawing")
  }

  return withCors(NextResponse.json({ success: true }))
}

export function OPTIONS() {
  return optionsResponse()
}
