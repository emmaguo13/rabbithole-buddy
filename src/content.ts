// Minimal TS annotator content script

type Tool = "none" | "draw" | "highlight" | "note";

let currentTool: Tool = "none";
let drawing = false;
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
  attachCanvasEvents();
  attachDocumentEvents();
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
    <button data-tool="none">🙈</button>
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

function attachCanvasEvents() {
  if (!canvas || !ctx) return;

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

function attachDocumentEvents() {
  document.addEventListener("mouseup", () => {
    if (currentTool === "highlight") highlightSelection();
  });

  document.addEventListener("dblclick", (e) => {
    if (currentTool === "note") addNoteAt(e.clientX, e.clientY);
  });
}

function highlightSelection() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  const mark = document.createElement("mark");
  mark.style.backgroundColor = "yellow";
  try {
    range.surroundContents(mark);
  } catch {}
  sel.removeAllRanges();
}

function addNoteAt(x: number, y: number) {
  const note = document.createElement("div");
  note.className = "annotator-note";
  note.style.left = x + "px";
  note.style.top = y + "px";

  const header = document.createElement("div");
  header.className = "annotator-note-header";
  header.textContent = "Note";

  const body = document.createElement("div");
  body.className = "annotator-note-body";
  body.contentEditable = "true";
  body.textContent = "Edit me";

  note.appendChild(header);
  note.appendChild(body);
  document.body.appendChild(note);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
