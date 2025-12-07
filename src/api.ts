const API_BASE = "http://localhost:3000/api"
const AUTH_TOKEN_KEY = "annotator:authToken"
const FALLBACK_USER_ID = "00000000-0000-0000-0000-000000000000" // UUID for dev-only fallback

type ItemResponse = { item: { id: string } }

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
