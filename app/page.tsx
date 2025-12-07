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

const DEMO_USER_ID =
  process.env.NEXT_PUBLIC_DEMO_USER_ID ?? process.env.DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000000"

export default async function HomePage() {
  const { groups, error } = await loadGroups()

  return (
    <main className="page">

      <section>
        <div className="section-head">
          <div>
            <p className="eyebrow">Groups</p>
            <h2>Your saved clusters</h2>
            <p className="lede subtle">
              Each card shows a group label, optional summary, and the latest links inside it.
            </p>
          </div>
          <p className="pill">Live data</p>
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
                <span className="pill">{group.items.length} link{group.items.length === 1 ? "" : "s"}</span>
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
    const hdrs = headers()
    const host = hdrs.get("host")
    const protocol = hdrs.get("x-forwarded-proto") ?? "http"
    const originEnv = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL
    const origin = originEnv || (host ? `${protocol}://${host}` : undefined)
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

function cleanUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname + parsed.pathname
  } catch {
    return url
  }
}
