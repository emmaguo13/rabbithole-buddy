import { attachCanvasEvents } from "./drawing"
import { attachDocumentEvents } from "./notes"

export type Tool = "none" | "draw" | "highlight" | "note";

let currentTool: Tool = "none";
let ctx: CanvasRenderingContext2D | null = null;
let canvas: HTMLCanvasElement | null = null;

function init() {
  if (document.getElementById("annotator-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "annotator-overlay";
  document.body.appendChild(overlay);

  canvas = document.createElement("canvas");
  canvas.id = "annotator-canvas";
  overlay.appendChild(canvas);

  ctx = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  createToolbar();
  attachCanvasEvents({
    canvas,
    ctx,
    getTool: () => currentTool,
  });
  attachDocumentEvents(() => currentTool);
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createToolbar() {
  const toolbar = document.createElement("div");
  toolbar.id = "annotator-toolbar";
  toolbar.innerHTML = `
    <button data-tool="draw">✏️</button>
    <button data-tool="highlight">🖍</button>
    <button data-tool="note">📝</button>
  `;
  document.body.appendChild(toolbar);

  toolbar.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = btn.getAttribute("data-tool") as Tool;
      setTool(tool);
    });
  });
}

function setTool(tool: Tool) {
  currentTool = tool;
  const toolbar = document.getElementById("annotator-toolbar");
  toolbar?.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-tool") === tool);
  });
  if (canvas) canvas.style.pointerEvents = tool === "draw" ? "auto" : "none";
}


if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
