import { z } from "zod"

export const itemCreateSchema = z.object({
  pageUrl: z.string().url(),
  title: z.string().max(300).optional(),
})

export const itemUpdateSchema = z.object({
  title: z.string().max(300).optional(),
})

export const noteSchema = z.object({
  id: z.string().uuid().optional(),
  content: z.string().optional(),
  position: z.unknown().optional(),
  rects: z.unknown().optional(),
})

export const highlightSchema = z.object({
  id: z.string().uuid().optional(),
  text: z.string().optional(),
  rects: z.unknown().optional(),
})

export const drawingSchema = z.object({
  id: z.string().uuid().optional(),
  blobRef: z.string().min(1),
  bounds: z.unknown().optional(),
})
