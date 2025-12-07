import {
  SAVE_REQUEST,
  SAVE_STATE_CHANGED,
  UNSAVE_REQUEST,
  type BackgroundMessage,
  type ContentMessage,
} from "./messages"

type TabInfo = {
  id?: number
  url?: string
  title?: string
}

type ChangeInfo = { status?: string }

declare const chrome: {
  action: {
    setIcon: (details: {
      tabId?: number
      path?: Record<string, string>
      imageData?: Record<number, ImageData>
    }) => void
    onClicked: { addListener(listener: (tab: TabInfo) => void): void }
  }
  tabs: {
    sendMessage: (tabId: number, message: unknown) => void
    onUpdated: {
      addListener: (
        listener: (tabId: number, changeInfo: ChangeInfo, tab: TabInfo) => void,
      ) => void
    }
  }
  runtime: {
    onMessage: {
      addListener: (
        listener: (message: unknown, sender: { tab?: TabInfo }) => void,
      ) => void
    }
  }
}

const DEFAULT_ICON_PATHS: Record<string, string> = {
  16: "icons/icon.png",
  32: "icons/icon.png",
  48: "icons/icon.png",
  128: "icons/icon.png",
}

const SAVED_ICON_COLOR = "#39c972"
const SAVED_ICON_BORDER = "#15844b"

const savedTabs = new Set<number>()
const savedIconCache = new Map<string, Record<number, ImageData>>()

chrome.action.onClicked.addListener((tab: TabInfo) => {
  console.info("[bookmark] Save button clicked", { url: tab?.url })

  if (typeof tab.id !== "number") return

  const isSaved = savedTabs.has(tab.id)
  if (isSaved) {
    savedTabs.delete(tab.id)
    setIcon(tab.id, false)
    sendMessageToTab(tab.id, { type: UNSAVE_REQUEST } satisfies BackgroundMessage)
    return
  }

  sendMessageToTab(tab.id, {
    type: SAVE_REQUEST,
    url: tab.url,
    title: tab.title,
  } satisfies BackgroundMessage)
})

chrome.runtime.onMessage.addListener((message: unknown, sender) => {
  const tabId = sender?.tab?.id
  if (typeof tabId !== "number") return

  const parsed = message as ContentMessage
  if (parsed?.type !== SAVE_STATE_CHANGED) return

  if (parsed.saved) savedTabs.add(tabId)
  else savedTabs.delete(tabId)

  setIcon(tabId, parsed.saved)
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "loading") return
  savedTabs.delete(tabId)
  setIcon(tabId, false)
  sendMessageToTab(tabId, { type: UNSAVE_REQUEST } satisfies BackgroundMessage)
})

function setIcon(tabId: number, saved: boolean) {
  if (!saved) {
    setIconSafe(tabId, { path: DEFAULT_ICON_PATHS })
    return
  }

  const icons = getSavedIcons()
  if (!icons) {
    setIconSafe(tabId, { path: DEFAULT_ICON_PATHS })
    return
  }

  setIconSafe(tabId, { imageData: icons, path: DEFAULT_ICON_PATHS })
}

function getSavedIcons(): Record<number, ImageData> | null {
  if (savedIconCache.has(SAVED_ICON_COLOR)) {
    return savedIconCache.get(SAVED_ICON_COLOR) ?? null
  }

  if (typeof OffscreenCanvas === "undefined") return null

  const icons: Record<number, ImageData> = {}
  const sizes = [16, 32, 48, 128]

  for (const size of sizes) {
    const canvas = new OffscreenCanvas(size, size)
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    ctx.fillStyle = SAVED_ICON_COLOR
    ctx.strokeStyle = SAVED_ICON_BORDER
    ctx.lineWidth = Math.max(2, Math.round(size * 0.08))
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - ctx.lineWidth, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    icons[size] = ctx.getImageData(0, 0, size, size)
  }

  savedIconCache.set(SAVED_ICON_COLOR, icons)
  return icons
}

function sendMessageToTab(tabId: number, message: BackgroundMessage) {
  try {
    chrome.tabs.sendMessage(tabId, message, () => {
      const err = (chrome.runtime as { lastError?: { message?: string } })?.lastError
      if (err) {
        console.debug("[bookmark] Message dropped (no receiver?)", err.message)
      }
    })
  } catch (error) {
    console.debug("[bookmark] Failed to send message", error)
  }
}

function setIconSafe(tabId: number, opts: { path?: Record<string, string>; imageData?: Record<number, ImageData> }) {
  try {
    chrome.action.setIcon({ tabId, ...opts }, () => {
      const err = (chrome.runtime as { lastError?: { message?: string } })?.lastError
      if (err) {
        console.debug("[bookmark] setIcon failed, falling back", err.message)
        if (opts.imageData && !opts.path) {
          chrome.action.setIcon({ tabId, path: DEFAULT_ICON_PATHS })
        }
      }
    })
  } catch (error) {
    console.debug("[bookmark] setIcon threw, using defaults", error)
    chrome.action.setIcon({ tabId, path: DEFAULT_ICON_PATHS })
  }
}
