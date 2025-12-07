import type { Tool } from "./extension"

type Args = {
  getTool: () => Tool
  isSaved: () => boolean
}

type Rect = { top: number; left: number; width: number; height: number }

type HighlightEntry = {
  id: string
  highlight?: HTMLElement
  rects: Rect[]
  note?: HTMLDivElement
  ghosts: HTMLDivElement[]
}

let highlightCounter = 0
const highlights = new Map<string, HighlightEntry>()

export function attachDocumentEvents({ getTool, isSaved }: Args) {
  document.addEventListener("mouseup", () => {
    if (!isSaved()) return
    if (getTool() === "highlight") highlightSelection()
  })

  document.addEventListener("dblclick", (e) => {
    if (!isSaved() || getTool() !== "note") return

    const target = e.target as HTMLElement | null
    const mark = target?.closest("mark.annotator-highlight") as HTMLElement | null
    if (mark) addNoteForHighlight(mark)
  })

  window.addEventListener("scroll", () => {
    updateAllNotePositions()
    ensureHighlightsVisible()
  })
  window.addEventListener("resize", () => {
    updateAllNotePositions()
    ensureHighlightsVisible()
  })
}

function highlightSelection() {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  if (range.collapsed) return

  const rects = Array.from(range.getClientRects()).map(toPageRect)

  const mark = document.createElement("mark")
  const id = String(++highlightCounter)
  mark.className = "annotator-highlight"
  mark.dataset.annotatorHighlightId = id
  try {
    range.surroundContents(mark)
  } catch {}
  sel.removeAllRanges()

  const entry: HighlightEntry = {
    id,
    highlight: mark,
    rects,
    ghosts: [],
  }
  highlights.set(id, entry)
  ensureHighlightsVisible()
}

function addNoteForHighlight(mark: HTMLElement) {
  const rect = mark.getBoundingClientRect()
  const x = rect.right + 8
  const y = rect.top - 6
  const highlightId = mark.dataset.annotatorHighlightId
  if (!highlightId) return

  addNoteAt(x, y, highlightId, mark)
}

function addNoteAt(
  x: number,
  y: number,
  highlightId?: string,
  highlightEl?: HTMLElement,
): HTMLDivElement {
  const note = document.createElement("div")
  note.className = "annotator-note"
  note.style.left = x + "px"
  note.style.top = y + "px"
  if (highlightId) note.dataset.highlightId = highlightId

  const header = document.createElement("div")
  header.className = "annotator-note-header"
  header.textContent = highlightId ? "Highlight note" : "Note"

  const body = document.createElement("div")
  body.className = "annotator-note-body"
  body.contentEditable = "true"
  body.textContent = "Edit me"

  note.appendChild(header)
  note.appendChild(body)
  document.body.appendChild(note)

  if (highlightId) {
    registerHighlightNote(highlightId, highlightEl, note)
  }

  return note
}

function registerHighlightNote(
  highlightId: string,
  highlight: HTMLElement | undefined,
  note: HTMLDivElement,
) {
  const entry = getHighlightEntry(highlightId)
  entry.highlight = highlight ?? entry.highlight
  entry.note = note
  updateNotePosition(entry)
}

function updateAllNotePositions() {
  highlights.forEach((entry) => updateNotePosition(entry))
}

function updateNotePosition(entry: HighlightEntry) {
  const highlight = getHighlightElement(entry)
  const anchorRect =
    highlight?.getBoundingClientRect() ??
    (entry.rects.length ? toViewportRect(entry.rects[0]) : null)
  if (!anchorRect) return

  if (entry.note) {
    entry.note.style.left = anchorRect.right + 8 + "px"
    entry.note.style.top = anchorRect.top - 6 + "px"
  }
}

function ensureHighlightsVisible() {
  highlights.forEach((entry) => {
    const highlight = getHighlightElement(entry)
    if (highlight) {
      cleanupGhosts(entry)
      return
    }
    renderGhosts(entry)
  })
}

function renderGhosts(entry: HighlightEntry) {
  if (!entry.rects.length) return
  cleanupGhosts(entry)

  entry.ghosts = entry.rects.map((rect) => {
    const div = document.createElement("div")
    div.className = "annotator-highlight-ghost"
    div.style.left = rect.left + "px"
    div.style.top = rect.top + "px"
    div.style.width = rect.width + "px"
    div.style.height = rect.height + "px"
    document.body.appendChild(div)
    return div
  })
}

function cleanupGhosts(entry: HighlightEntry) {
  entry.ghosts.forEach((g) => g.remove())
  entry.ghosts = []
}

function getHighlightEntry(id: string): HighlightEntry {
  if (!highlights.has(id)) {
    highlights.set(id, { id, rects: [], ghosts: [] })
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return highlights.get(id)!
}

function getHighlightElement(entry: HighlightEntry): HTMLElement | null {
  if (entry.highlight && document.documentElement.contains(entry.highlight)) {
    return entry.highlight
  }
  const found = document.querySelector<HTMLElement>(
    `mark.annotator-highlight[data-annotator-highlight-id="${entry.id}"]`,
  )
  if (found) entry.highlight = found
  return found
}

function toPageRect(rect: DOMRect): Rect {
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  }
}

function toViewportRect(rect: Rect): DOMRect {
  return new DOMRect(
    rect.left - window.scrollX,
    rect.top - window.scrollY,
    rect.width,
    rect.height,
  )
}
