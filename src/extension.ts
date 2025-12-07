import { attachCanvasEvents } from "./drawing"
import {
  SAVE_REQUEST,
  SAVE_STATE_CHANGED,
  UNSAVE_REQUEST,
  type ContentMessage,
} from "./messages"
import { attachDocumentEvents } from "./notes"

export type Tool = "none" | "draw" | "highlight" | "note"

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

function handleSaveRequest() {
  saved = true
  maybeInitUI()
  toggleUIVisibility(true)
  reportSaveState(true)
}

function handleUnsaveRequest() {
  saved = false
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
  attachDocumentEvents(getActiveTool)
}

function resizeCanvas() {
  if (!canvas || !overlay) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
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
      setTool(tool)
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

    if (type === SAVE_REQUEST) handleSaveRequest()
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
  })
}

bindMessageListener()
