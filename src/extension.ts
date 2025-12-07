import { attachCanvasEvents } from "./drawing"
import { saveItem } from "./api"
import {
  SAVE_REQUEST,
  SAVE_STATE_CHANGED,
  UNSAVE_REQUEST,
  type ContentMessage,
  type SaveRequestMessage,
} from "./messages"
import { attachDocumentEvents } from "./notes"

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

async function handleSaveRequest(message: SaveRequestMessage) {
  const pageUrl = message.url || window.location.href
  const title = document.title

  try {
    await saveItem({ pageUrl, title })
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
  })
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
  })
}

bindMessageListener()
