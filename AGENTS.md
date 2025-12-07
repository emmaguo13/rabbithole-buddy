# Repository Guidelines

## Project Structure & Module Organization
- `src/content.ts`: TypeScript content script that injects the overlay canvas, toolbar, and note/highlight handlers.
- `src/styles.css`: Styling for the toolbar, canvas overlay, and notes; copied into the build output.
- `manifest.json`: Chrome MV3 manifest wiring the bundled `content.js` and `styles.css` into all pages.
- `dist/`: Bundled artifacts produced by esbuild; do not edit by hand.
- TypeScript is compiled with `strict` mode via `tsconfig.json`.

## Build, Test, and Development Commands
- Install deps once: `npm install`.
- Bundle for release: `npm run build` (produces `dist/content.js`, copies `manifest.json` and `styles.css`).
- Watch during development: `npm run watch` (rebundles on save).
- Load the extension for manual testing: Chrome > Extensions > Load unpacked > select `dist/`.

## Coding Style & Naming Conventions
- Use TypeScript with `strict` types; prefer explicit types on public functions and DOM event handlers.
- Two-space indentation; keep lines readable (<100 chars when practical).
- Favor small helpers over inlined logic inside event listeners; keep side effects contained.
- DOM ids/classes: prefix annotator-specific elements with `annotator-` to avoid collisions.
- Run `npm run build` before sharing changes to ensure the bundle compiles cleanly.

## Testing Guidelines
- No automated test suite yet; rely on manual verification in Chrome.
- Smoke-test scenarios after changes: drawing strokes, highlighting selections, adding notes, resizing the window, and toggling tools.
- If you add tests, colocate them alongside source (e.g., `src/content.spec.ts`) and document the runner used.

## Commit & Pull Request Guidelines
- Commit messages: concise imperative style (e.g., “Add note drag handles”); group related edits together.
- Pull requests should include: a short summary of behavior changes, screenshots or GIFs of UI updates, and steps to reproduce manual tests run.
- Keep diffs minimal in `dist/`; reviewers focus on `src/` and config files. Rebuild only when necessary and mention the command used.

## Security & Configuration Tips
- Content script runs on `<all_urls>`; avoid introducing remote network calls or storing sensitive data.
- Keep overlay elements isolated: use high `z-index` and scoped selectors to prevent interfering with host pages.
