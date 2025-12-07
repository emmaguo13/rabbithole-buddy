import type { Tool } from "./extension.ts"
export function attachCanvasEvents(args: {
    canvas: HTMLCanvasElement | null 
    ctx: CanvasRenderingContext2D | null
    currentTool: Tool
}) {

  const { canvas, ctx, currentTool } = args
  if (!canvas || !ctx) return;

  let drawing: Boolean = false

  canvas.addEventListener("mousedown", (e) => {
    if (currentTool !== "draw") return;
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!drawing || currentTool !== "draw") return;
    ctx.lineTo(e.clientX, e.clientY);
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
  });

  window.addEventListener("mouseup", () => (drawing = false));
}