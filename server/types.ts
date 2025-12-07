export type ItemRecord = {
  id: string
  user_id: string
  page_url: string
  title: string | null
  saved_at: string
  updated_at: string
}

export type NoteRecord = {
  id: string
  item_id: string
  content: string | null
  position_json: unknown
  rects_json: unknown
  created_at: string
  updated_at: string
}

export type HighlightRecord = {
  id: string
  item_id: string
  text: string | null
  rects_json: unknown
  created_at: string
  updated_at: string
}

export type DrawingRecord = {
  id: string
  item_id: string
  blob_ref: string
  bounds_json: unknown
  created_at: string
  updated_at: string
}
