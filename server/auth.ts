import { NextRequest, NextResponse } from "next/server"
import { withCors } from "./http"

export function requireUser(req: NextRequest):
  | { userId: string }
  | { response: NextResponse<{ error: string }> } {
  const authHeader = req.headers.get("authorization")
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null
  const fallback = req.headers.get("x-user-id")
  const userId = bearer || fallback

  if (!userId) {
    return {
      response: withCors(
        NextResponse.json({ error: "Missing auth header" }, { status: 401 }),
      ),
    }
  }
  return { userId }
}
