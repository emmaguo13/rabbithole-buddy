import { NextRequest, NextResponse } from "next/server"
import type { ZodSchema } from "zod"

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
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    }
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json({ error: result.error.flatten() }, { status: 400 }),
    }
  }

  return { success: true, data: result.data }
}

export function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 })
}

export function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 })
}
