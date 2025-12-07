export const SAVE_REQUEST = "annotator:save-page-request" as const
export const UNSAVE_REQUEST = "annotator:unsave-page-request" as const
export const SAVE_STATE_CHANGED = "annotator:save-state-changed" as const

export type SaveRequestMessage = { type: typeof SAVE_REQUEST; url?: string }
export type UnsaveRequestMessage = { type: typeof UNSAVE_REQUEST }
export type SaveStateChangedMessage = {
  type: typeof SAVE_STATE_CHANGED
  saved: boolean
}

export type BackgroundMessage = SaveRequestMessage | UnsaveRequestMessage
export type ContentMessage = SaveStateChangedMessage
