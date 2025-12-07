import { NextResponse, type NextRequest } from "next/server"
import { requireUser } from "@/server/auth"
import { serverError } from "@/server/http"
import { ensureItemOwnership } from "@/server/items"
import { supabase } from "@/server/supabase"

export const runtime = "nodejs"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = requireUser(req)
  if ("response" in auth) return auth.response

  const { data: note, error } = await supabase
    .from("notes")
    .select("id, item_id")
    .eq("id", params.id)
    .single()

  if (error || !note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 })
  }

  const owner = await ensureItemOwnership(note.item_id, auth.userId)
  if (owner instanceof NextResponse) return owner

  const { error: deleteError } = await supabase.from("notes").delete().eq("id", params.id)
  if (deleteError) {
    console.error("[api/notes/:id] Failed to delete note", deleteError)
    return serverError("Failed to delete note")
  }

  return NextResponse.json({ success: true })
}
