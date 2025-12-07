import type { Tool } from "./extension"

type Args = {
  getTool: () => Tool
  isSaved: () => boolean
  getItemId: () => string | null
  persistHighlight: (payload: { id?: string; text?: string; rects: Rect[] }) => Promise<string | null>
  persistNote: (payload: {
    id?: string
    content?: string
    rects: Rect[]
    position?: { left: number; top: number }
  }) => Promise<string | null>
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

let getItemIdRef: () => string | null = () => null
let persistHighlightRef: Args["persistHighlight"] = async () => null
let persistNoteRef: Args["persistNote"] = async () => null

export function attachDocumentEvents({
  getTool,
  isSaved,
  getItemId,
  persistHighlight,
  persistNote,
}: Args) {
  getItemIdRef = getItemId
  persistHighlightRef = persistHighlight
  persistNoteRef = persistNote

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
  const itemId = getItemIdRef()
  if (!itemId) return

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

  void persistHighlightRef({
    id,
    text: range.toString(),
    rects,
  }).then((savedId) => {
    if (savedId) updateHighlightId(id, savedId)
  })
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
  initialContent?: string,
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
  body.textContent = initialContent ?? "Edit me"

  note.appendChild(header)
  note.appendChild(body)
  document.body.appendChild(note)

  if (highlightId) {
    registerHighlightNote(highlightId, highlightEl, note)
  }

  const persist = () => {
    const rects =
      highlightId && highlights.has(highlightId) ? getHighlightEntry(highlightId).rects : []
    const position = { left: x, top: y }
    const content = body.textContent ?? ""
    void persistNoteRef({
      id: note.dataset.noteId,
      content,
      rects,
      position,
    }).then((savedId) => {
      if (savedId) note.dataset.noteId = savedId
    })
  }

  body.addEventListener("blur", persist)

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
    placeNoteNearRect(entry.note, anchorRect)
  }
}

function placeNoteNearRect(note: HTMLDivElement, anchor: DOMRect) {
  const viewportPadding = 12
  const gap = 12
  const noteRect = note.getBoundingClientRect()

  // Try to place to the right of the highlight.
  let left = anchor.right + gap
  let top = anchor.top

  // If it overflows, try to place to the left.
  if (left + noteRect.width + viewportPadding > window.innerWidth) {
    left = anchor.left - gap - noteRect.width
  }

  // If still overflowing, place below and center-ish.
  if (left < viewportPadding) {
    left = Math.min(
      Math.max(viewportPadding, anchor.left + gap),
      window.innerWidth - viewportPadding - noteRect.width,
    )
    top = anchor.bottom + gap
  }

  // Keep within viewport vertically.
  top = Math.max(
    viewportPadding,
    Math.min(top, window.innerHeight - viewportPadding - noteRect.height),
  )

  note.style.left = `${left}px`
  note.style.top = `${top}px`
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

function updateHighlightId(oldId: string, newId: string) {
  if (oldId === newId) return
  const entry = highlights.get(oldId)
  if (!entry) return
  highlights.delete(oldId)
  entry.id = newId
  if (entry.highlight) entry.highlight.dataset.annotatorHighlightId = newId
  if (entry.note) entry.note.dataset.highlightId = newId
  highlights.set(newId, entry)
}

export function restoreHighlightEntry(id: string, rects: Rect[]) {
  const entry: HighlightEntry = {
    id,
    rects,
    ghosts: [],
  }
  highlights.set(id, entry)
  ensureHighlightsVisible()
}

export function restoreNoteAt(
  id: string,
  content: string | null,
  position: { left?: number; top?: number } | null,
) {
  const x = position?.left ?? 24
  const y = position?.top ?? 24
  const note = addNoteAt(x, y, undefined, undefined, content ?? undefined)
  note.dataset.noteId = id
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
