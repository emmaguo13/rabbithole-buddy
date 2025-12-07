import { NextResponse } from "next/server"
import { optionsResponse, withCors } from "@/server/http"

export const runtime = "nodejs"

export async function GET() {
  return withCors(NextResponse.json({ ok: true }))
}

export function OPTIONS() {
  return optionsResponse()
}
