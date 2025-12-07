import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/server/auth"
import { optionsResponse, serverError, withCors } from "@/server/http"
import { generateRecommendations } from "@/server/recommendations"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const auth = requireUser(req)
  if ("response" in auth) return auth.response

  const { recommendations, message } = await generateRecommendations(auth.userId)
  if (!recommendations && !message) {
    return serverError("Failed to generate recommendations")
  }

  return withCors(NextResponse.json({ recommendations, message }))
}

export function OPTIONS() {
  return optionsResponse()
}
