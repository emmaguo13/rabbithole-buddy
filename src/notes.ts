import type { Tool } from "./extension"

type Args = {
  getTool: () => Tool
  isSaved: () => boolean
}

let highlightCounter = 0

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
}

function highlightSelection() {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  if (range.collapsed) return

  const mark = document.createElement("mark")
  mark.className = "annotator-highlight"
  mark.dataset.annotatorHighlightId = String(++highlightCounter)
  try {
    range.surroundContents(mark)
  } catch {}
  sel.removeAllRanges()
}

function addNoteForHighlight(mark: HTMLElement) {
  const rect = mark.getBoundingClientRect()
  const x = rect.right + 8
  const y = rect.top - 6
  addNoteAt(x, y, mark.dataset.annotatorHighlightId)
}

function addNoteAt(x: number, y: number, highlightId?: string) {
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
}
