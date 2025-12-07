import type { Tool } from "./extension"

export function attachCanvasEvents(args: {
  canvas: HTMLCanvasElement | null
  ctx: CanvasRenderingContext2D | null
  getTool: () => Tool
}) {
  const { canvas, ctx, getTool } = args
  if (!canvas || !ctx) return

  let drawing = false

  canvas.addEventListener("mousedown", (e) => {
    if (getTool() !== "draw") return
    drawing = true
    ctx.beginPath()
    ctx.moveTo(e.clientX, e.clientY)
  })

  canvas.addEventListener("mousemove", (e) => {
    if (!drawing || getTool() !== "draw") return
    ctx.lineTo(e.clientX, e.clientY)
    ctx.strokeStyle = "yellow"
    ctx.lineWidth = 4
    ctx.lineCap = "round"
    ctx.stroke()
  })

  window.addEventListener("mouseup", () => (drawing = false))
}
