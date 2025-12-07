import type { ReactNode } from "react"
import "./globals.css"

export const metadata = {
  title: "Rabbithole Buddy",
  description: "Saved links, highlights, and drawings",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
