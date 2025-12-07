import type { Tool } from "./extension.ts"

export function attachDocumentEvents(currentTool: Tool) {
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