type TabInfo = {
  id?: number
  url?: string
  title?: string
}

declare const chrome: {
  action: {
    onClicked: { addListener(listener: (tab: TabInfo) => void): void }
  }
  tabs: {
    sendMessage: (tabId: number, message: unknown) => void
  }
}

const SAVE_REQUEST = "annotator:save-page-request"

chrome.action.onClicked.addListener((tab: TabInfo) => {
  console.info("[bookmark] Save button clicked", { url: tab?.url })

  if (typeof tab.id !== "number") return
  chrome.tabs.sendMessage(tab.id, { type: SAVE_REQUEST, url: tab.url })
})
