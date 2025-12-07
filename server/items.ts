import { NextResponse } from "next/server"
import { supabase } from "./supabase"
import type { ItemRecord } from "./types"

export async function ensureItemOwnership(
  itemId: string,
  userId: string,
): Promise<ItemRecord | NextResponse> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  return data as ItemRecord
}
