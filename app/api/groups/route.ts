import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/server/auth"
import { optionsResponse, serverError, withCors } from "@/server/http"
import { supabase } from "@/server/supabase"
import type { ItemGroupRecord, ItemRecord } from "@/server/types"

export const runtime = "nodejs"

type GroupWithItems = ItemGroupRecord & {
  items: Array<Pick<ItemRecord, "id" | "title" | "page_url" | "saved_at" | "updated_at">>
}

export async function GET(req: NextRequest) {
  const auth = requireUser(req)
  if ("response" in auth) return auth.response

  const { data, error } = await supabase
    .from("item_groups")
    .select("id,label,summary,created_at,updated_at,items(id,title,page_url,saved_at,updated_at)")
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: false })
    .order("updated_at", { referencedTable: "items", ascending: false })
    .limit(50)

  if (error) {
    console.error("[api/groups] Failed to list groups", error)
    return serverError("Failed to load groups")
  }

  return withCors(
    NextResponse.json({
      groups: ((data ?? []) as GroupWithItems[]).map((group) => ({
        ...group,
        items: group.items ?? [],
      })),
    }),
  )
}

export function OPTIONS() {
  return optionsResponse()
}
