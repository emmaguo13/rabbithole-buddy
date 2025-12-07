const API_BASE = "http://localhost:3000/api"
const AUTH_TOKEN_KEY = "annotator:authToken"
const FALLBACK_USER_ID = "00000000-0000-0000-0000-000000000000" // UUID for dev-only fallback

type ItemResponse = { item: { id: string } }
type HighlightResponse = { highlight: { id: string } }
type NoteResponse = { note: { id: string } }
type PageStateResponse = {
  item: { id: string }
  notes: Array<{
    id: string
    content: string | null
    position_json: { left?: number; top?: number } | null
    rects_json: unknown
  }>
  highlights: Array<{
    id: string
    text: string | null
    rects_json: unknown
  }>
  drawings: unknown[]
}

declare const chrome: {
  storage?: {
    local: {
      get: (keys: string[] | string, cb: (items: Record<string, unknown>) => void) => void
      set: (items: Record<string, unknown>, cb?: () => void) => void
    }
  }
}

async function getStoredToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) return resolve(null)
    chrome.storage.local.get([AUTH_TOKEN_KEY], (result) => {
      const token = result?.[AUTH_TOKEN_KEY]
      if (typeof token === "string" && token.length > 0) {
        resolve(token)
      } else {
        resolve(null)
      }
    })
  })
}

async function ensureAuthToken(): Promise<string> {
  const existing = await getStoredToken()
  if (existing) return existing
  // Fallback to hardcoded user id for local/dev use (no auth).
  return FALLBACK_USER_ID
}

export async function saveItem(params: { pageUrl: string; title?: string }) {
  const token = await ensureAuthToken()
  const res = await fetch(`${API_BASE}/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": token,
    },
    body: JSON.stringify({ pageUrl: params.pageUrl, title: params.title }),
  })

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "")
    throw new Error(`Failed to save item: ${res.status} ${errorBody}`)
  }

  const json = (await res.json()) as ItemResponse
  return json.item
}

export async function saveHighlight(params: {
  itemId: string
  id?: string
  text?: string
  rects?: unknown
}) {
  const token = await ensureAuthToken()
  const res = await fetch(`${API_BASE}/items/${params.itemId}/highlights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": token,
    },
    body: JSON.stringify({
      id: params.id,
      text: params.text,
      rects: params.rects,
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "")
    throw new Error(`Failed to save highlight: ${res.status} ${errorBody}`)
  }

  const json = (await res.json()) as HighlightResponse
  return json.highlight
}

export async function saveNote(params: {
  itemId: string
  id?: string
  content?: string
  position?: unknown
  rects?: unknown
}) {
  const token = await ensureAuthToken()
  const res = await fetch(`${API_BASE}/items/${params.itemId}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": token,
    },
    body: JSON.stringify({
      id: params.id,
      content: params.content,
      position: params.position,
      rects: params.rects,
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "")
    throw new Error(`Failed to save note: ${res.status} ${errorBody}`)
  }

  const json = (await res.json()) as NoteResponse
  return json.note
}

export async function loadPageState(pageUrl: string) {
  const token = await ensureAuthToken()
  const res = await fetch(`${API_BASE}/items/by-url?url=${encodeURIComponent(pageUrl)}`, {
    headers: {
      "x-user-id": token,
    },
  })

  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Failed to load page state: ${res.status} ${body}`)
  }

  const json = (await res.json()) as PageStateResponse
  return json
}
