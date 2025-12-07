import Link from "next/link"
import { headers } from "next/headers"

export const runtime = "nodejs"

type GroupItem = {
  id: string
  title: string | null
  page_url: string
  saved_at: string
  updated_at: string
}

type Group = {
  id: string
  label: string
  summary: string | null
  created_at: string
  updated_at: string
  items: GroupItem[]
}

type Recommendation = {
  title: string
  summary: string
  suggested_query: string
}

const DEMO_USER_ID =
  process.env.NEXT_PUBLIC_DEMO_USER_ID ?? process.env.DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000000"

export default async function HomePage() {
  const { groups, error } = await loadGroups()
  const { recommendations, recError } = await loadRecommendations()

  return (
    <main className="page">

      <section className="content-block">
        <div className="section-head">
          <div>
            <h2>Suggested reading</h2>
          </div>
        </div>

        {!recommendations.length && (
          <div className="empty-state">
            <p>No recommendations yet.</p>
            <p className="subtle">Save a few items and refresh to see suggestions.</p>
          </div>
        )}

        <div className="rec-list">
          {recommendations.map((rec, idx) => (
            <article key={idx} className="rec-card">
              <h3>{rec.title}</h3>
              <p className="subtle">{rec.summary}</p>
              <a
                className="button ghost"
                href={`https://www.google.com/search?q=${encodeURIComponent(rec.suggested_query)}`}
                target="_blank"
                rel="noreferrer"
              >
                Search this ↗
              </a>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <div>
            <h2>Your clusters</h2>
          </div>
        </div>

        {!groups.length && (
          <div className="empty-state">
            <p>No groups yet.</p>
            <p className="subtle">Save a page from the extension to seed your first grouping.</p>
          </div>
        )}

        <div className="group-grid">
          {groups.map((group) => (
            <article key={group.id} className="group-card">
              <div className="group-header">
                <div>
                  <p className="eyebrow">{new Date(group.updated_at).toLocaleDateString()}</p>
                  <h3>{group.label}</h3>
                  {group.summary && <p className="subtle">{group.summary}</p>}
                </div>
              </div>
              <ul className="group-items">
                {group.items.map((item) => (
                  <li key={item.id} className="group-item">
                    <div>
                      <p className="item-title">{item.title ?? "Untitled page"}</p>
                      <p className="item-url">{cleanUrl(item.page_url)}</p>
                    </div>
                    <a href={item.page_url} target="_blank" rel="noreferrer" className="item-link">
                      Open ↗
                    </a>
                  </li>
                ))}
                {!group.items.length && <li className="subtle">No links yet.</li>}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

async function loadGroups(): Promise<{ groups: Group[]; error?: string }> {
  if (!DEMO_USER_ID) {
    return { groups: [], error: "Set DEMO_USER_ID or NEXT_PUBLIC_DEMO_USER_ID to fetch your groups." }
  }

  try {
    const origin = getOrigin()
    if (!origin) {
      return { groups: [], error: "Could not resolve API origin." }
    }

    const res = await fetch(`${origin}/api/groups`, {
      cache: "no-store",
      headers: {
        "x-user-id": DEMO_USER_ID,
      },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { groups: [], error: body?.error ?? "Failed to load groups." }
    }

    const json = (await res.json()) as { groups: Group[] }
    return { groups: json.groups ?? [] }
  } catch (error) {
    console.error("[ui] Failed to load groups", error)
    return { groups: [], error: "Could not reach API." }
  }
}

async function loadRecommendations(): Promise<{ recommendations: Recommendation[]; recError?: string }> {
  if (!DEMO_USER_ID) {
    return {
      recommendations: [],
      recError: "Set DEMO_USER_ID or NEXT_PUBLIC_DEMO_USER_ID to fetch your groups.",
    }
  }

  try {
    const origin = getOrigin()
    if (!origin) {
      return { recommendations: [], recError: "Could not resolve API origin." }
    }

    const res = await fetch(`${origin}/api/recommendations`, {
      cache: "no-store",
      headers: {
        "x-user-id": DEMO_USER_ID,
      },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { recommendations: [], recError: body?.error ?? "Failed to load recommendations." }
    }

    const json = (await res.json()) as { recommendations: Recommendation[]; message?: string }
    return { recommendations: json.recommendations ?? [], recError: json.message }
  } catch (error) {
    console.error("[ui] Failed to load recommendations", error)
    return { recommendations: [], recError: "Could not reach recommendations." }
  }
}

function getOrigin(): string | undefined {
  const hdrs = headers()
  const host = hdrs.get("host")
  const protocol = hdrs.get("x-forwarded-proto") ?? "http"
  const originEnv = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL
  return originEnv || (host ? `${protocol}://${host}` : undefined)
}

function cleanUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname + parsed.pathname
  } catch {
    return url
  }
}
