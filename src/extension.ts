import { attachCanvasEvents } from "./drawing"
import { loadPageState, saveHighlight, saveItem, saveNote } from "./api"
import {
  SAVE_REQUEST,
  SAVE_STATE_CHANGED,
  UNSAVE_REQUEST,
  type ContentMessage,
  type SaveRequestMessage,
} from "./messages"
import { attachDocumentEvents, restoreHighlightEntry, restoreNoteAt } from "./notes"

export type Tool = "none" | "draw" | "note" | "highlight"

declare const chrome: {
  runtime?: {
    onMessage: { addListener: (listener: (message: unknown) => void) => void }
    sendMessage: (message: unknown) => void
  }
}

let currentTool: Tool = "none"
let ctx: CanvasRenderingContext2D | null = null
let canvas: HTMLCanvasElement | null = null
let overlay: HTMLDivElement | null = null
let toolbar: HTMLDivElement | null = null
let documentReady = document.readyState !== "loading"
let saved = false
let savedItemId: string | null = null
let loadedHighlights = false
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const normalizeId = (id?: string | null) => (id && uuidPattern.test(id) ? id : undefined)

async function handleSaveRequest(message: SaveRequestMessage) {
  const pageUrl = message.url || window.location.href
  const title = document.title

  try {
    const item = await saveItem({ pageUrl, title })
    savedItemId = item.id
    saved = true
    maybeInitUI()
    toggleUIVisibility(true)
    reportSaveState(true)
  } catch (err) {
    console.warn("[annotator] Failed to save item", err)
    reportSaveState(false)
  }
}

function handleUnsaveRequest() {
  saved = false
  savedItemId = null
  loadedHighlights = false
  setTool("none")
  toggleUIVisibility(false)
  reportSaveState(false)
}

function maybeInitUI() {
  if (!documentReady || overlay || toolbar) return

  overlay = document.createElement("div")
  overlay.id = "annotator-overlay"
  overlay.style.display = "none"
  document.body.appendChild(overlay)

  canvas = document.createElement("canvas")
  canvas.id = "annotator-canvas"
  overlay.appendChild(canvas)

  ctx = canvas.getContext("2d")
  resizeCanvas()
  window.addEventListener("resize", resizeCanvas)

  toolbar = createToolbar()
  toolbar.style.display = "none"

  attachCanvasEvents({
    canvas,
    ctx,
    getTool: getActiveTool,
  })
  attachDocumentEvents({
    getTool: getActiveTool,
    isSaved: () => saved,
    getItemId: () => savedItemId,
    persistHighlight: async ({ id, text, rects }) => {
      if (!savedItemId) return null
      const serverId = normalizeId(id)
      try {
        const savedHighlight = await saveHighlight({
          itemId: savedItemId,
          id: serverId,
          text,
          rects,
        })
        return savedHighlight.id
      } catch (err) {
        console.warn("[annotator] Failed to persist highlight", err)
        return null
      }
    },
    persistNote: async ({ id, content, rects, position }) => {
      if (!savedItemId) return null
      const serverId = normalizeId(id)
      try {
        const savedNote = await saveNote({
          itemId: savedItemId,
          id: serverId,
          content,
          rects,
          position,
        })
        return savedNote.id
      } catch (err) {
        console.warn("[annotator] Failed to persist note", err)
        return null
      }
    },
  })
}

async function bootstrapSavedState() {
  try {
    const state = await loadPageState(window.location.href)
    if (!state) return
    saved = true
    savedItemId = state.item.id
    loadedHighlights = true
    maybeInitUI()
    toggleUIVisibility(true)
    reportSaveState(true)
    restoreHighlights(state.highlights)
    restoreNotes(state.notes)
  } catch (err) {
    console.warn("[annotator] Failed to load saved state", err)
  }
}

function resizeCanvas() {
  if (!canvas || !overlay || !ctx) return

  const nextWidth = Math.max(
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
    window.innerWidth,
  )
  const nextHeight = Math.max(
    document.documentElement.scrollHeight,
    document.documentElement.clientHeight,
    window.innerHeight,
  )

  if (canvas.width === nextWidth && canvas.height === nextHeight) return

  const temp = document.createElement("canvas")
  temp.width = canvas.width
  temp.height = canvas.height
  const tempCtx = temp.getContext("2d")
  if (tempCtx) tempCtx.drawImage(canvas, 0, 0)

  canvas.width = nextWidth
  canvas.height = nextHeight
  overlay.style.width = `${nextWidth}px`
  overlay.style.height = `${nextHeight}px`

  if (tempCtx) ctx.drawImage(temp, 0, 0)
}

function createToolbar() {
  const el = document.createElement("div")
  el.id = "annotator-toolbar"
  el.innerHTML = `
    <button data-tool="draw">✏️</button>
    <button data-tool="highlight">🖍</button>
    <button data-tool="note">📝</button>
  `
  document.body.appendChild(el)

  el.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = btn.getAttribute("data-tool") as Tool
      const nextTool = currentTool === tool ? "none" : tool
      setTool(nextTool)
    })
  })

  return el
}

function setTool(tool: Tool) {
  currentTool = tool
  toolbar?.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-tool") === tool)
  })

  updateCanvasPointerState()
}

function getActiveTool(): Tool {
  return saved ? currentTool : "none"
}

function updateCanvasPointerState() {
  if (!canvas) return
  canvas.style.pointerEvents = saved && currentTool === "draw" ? "auto" : "none"
}

function toggleUIVisibility(visible: boolean) {
  if (!overlay || !toolbar) return

  overlay.style.display = visible ? "block" : "none"
  toolbar.style.display = visible ? "flex" : "none"

  if (visible) resizeCanvas()
  updateCanvasPointerState()
}

function restoreHighlights(highlights: Array<{ id: string; rects_json: unknown }>) {
  highlights.forEach((h) => {
    const rects = Array.isArray(h.rects_json) ? (h.rects_json as any) : []
    restoreHighlightEntry(
      h.id,
      rects
        .map((r: any) => ({
          top: Number(r.top) || 0,
          left: Number(r.left) || 0,
          width: Number(r.width) || 0,
          height: Number(r.height) || 0,
        }))
        .filter((r) => r.width > 0 && r.height > 0),
    )
  })
}

function restoreNotes(
  notes: Array<{
    id: string
    content: string | null
    position_json: { left?: number; top?: number } | null
  }>,
) {
  notes.forEach((n) => {
    restoreNoteAt(n.id, n.content, n.position_json ?? null)
  })
}

function reportSaveState(isSaved: boolean) {
  try {
    chrome.runtime?.sendMessage?.({
      type: SAVE_STATE_CHANGED,
      saved: isSaved,
    } satisfies ContentMessage)
  } catch (err) {
    console.warn("[annotator] Failed to report save state", err)
  }
}

function bindMessageListener() {
  chrome.runtime?.onMessage?.addListener((message: unknown) => {
    if (!message || typeof message !== "object") return
    const { type } = message as { type?: string }

    if (type === SAVE_REQUEST) void handleSaveRequest(message as SaveRequestMessage)
    if (type === UNSAVE_REQUEST) handleUnsaveRequest()
  })
}

if (!documentReady) {
  document.addEventListener("DOMContentLoaded", () => {
    documentReady = true
    if (saved) {
      maybeInitUI()
      toggleUIVisibility(true)
    }
    void bootstrapSavedState()
  })
} else {
  void bootstrapSavedState()
}

bindMessageListener()
