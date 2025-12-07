import Link from "next/link"

export const runtime = "nodejs"

export default function HomePage() {
  return (
    <main style={{ padding: "48px", maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, marginBottom: 12 }}>Rabbithole Buddy</h1>
      <p style={{ color: "#c7cfe2", marginBottom: 24 }}>
        Browser UI for your saved links, highlights, notes, and drawings. API routes are ready for
        the extension; UI coming next.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <Link
          href="/api/health"
          style={{
            padding: "10px 14px",
            background: "#1f6feb",
            color: "#f5f7fb",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Health check
        </Link>
        <a
          href="https://app.supabase.com/"
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "10px 14px",
            background: "#30363d",
            color: "#f5f7fb",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Supabase console
        </a>
      </div>
    </main>
  )
}
