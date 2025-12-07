import { NextRequest, NextResponse } from "next/server"
import type { ZodSchema } from "zod"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
}

export function withCors<T extends NextResponse>(res: T): T {
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export function optionsResponse() {
  return withCors(new NextResponse(null, { status: 200 }))
}

export async function parseJson<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return {
      success: false,
      response: withCors(NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })),
    }
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      success: false,
      response: withCors(
        NextResponse.json({ error: result.error.flatten() }, { status: 400 }),
      ),
    }
  }

  return { success: true, data: result.data }
}

export function serverError(message: string) {
  return withCors(NextResponse.json({ error: message }, { status: 500 }))
}

export function notFound(message: string) {
  return withCors(NextResponse.json({ error: message }, { status: 404 }))
}
