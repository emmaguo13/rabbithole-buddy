import { NextRequest, NextResponse } from "next/server"

export function requireUser(req: NextRequest):
  | { userId: string }
  | { response: NextResponse<{ error: string }> } {
  const userId = req.headers.get("x-user-id")
  if (!userId) {
    return {
      response: NextResponse.json({ error: "Missing x-user-id header" }, { status: 401 }),
    }
  }
  return { userId }
}
