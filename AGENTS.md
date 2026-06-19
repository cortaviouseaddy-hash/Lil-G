# AGENTS.md

## Cursor Cloud specific instructions

Lil-G is a single, dependency-free vanilla-JS Progressive Web App (no framework, no
backend, no database). State lives in the browser's `localStorage`; there is no build step.

- **Run the app (dev):** `npm start` — serves the static files with `python3 -m http.server 4173`. Open <http://localhost:4173>. There is no separate build/bundle step; files are served as-is, so a browser refresh picks up edits.
- **Tests:** `npm test` — runs Node's built-in runner (`node --test`) against `test/*.test.js`. Requires Node 18+ (Node 22 is present).
- **Lint:** there is no configured linter in this repo.
- **Dependencies:** `package.json` has no `dependencies`/`devDependencies`, so `npm install` is effectively a no-op and is not required to run or test.
- **Browser-only features won't work headlessly:** speech talk-back (`speechSynthesis`), mic dictation/wake word (`SpeechRecognition`), and screen share (Screen Capture API) need a real browser with permissions, and PWA install needs HTTPS. The text chat itself works fully over plain HTTP on localhost.
- **Internet search** (`src/webSearch.js`) calls Wikipedia's public OpenSearch API and falls back to a Google search link; it degrades gracefully offline.
