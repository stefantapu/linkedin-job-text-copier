# LinkedIn Job Text Copier / Fast Apply Panel — Chrome Web Store

Standalone Store source, version 0.5.4. Requires Node.js 24+ and npm.

From a clean checkout:

```powershell
npm ci
npm run typecheck
npm test
npm run build:store
npm run check:store
```

Load `dist/extension` as an unpacked extension at `chrome://extensions`. After source changes, run `npm run build`, reload the extension and refresh LinkedIn/ChatGPT/Sheets tabs. The repository root contains source templates and cannot be loaded directly.

Store output: `dist/chrome-web-store/extension`. ZIP only that folder's contents for upload. Publication has not been performed.

All five runtime entry points live in `src/*.ts`. `strict: true` checks DOM, state and shared message contracts in `src/contracts.ts`. Messaging binds each request to its response and validates unknown incoming values at runtime. Success, partial completion and uncertain ChatGPT/Sheets outcomes remain distinct; only Chrome's explicit missing-receiver error permits one recovery injection and retry.

The esbuild pipeline bundles each entry point into a standalone classic script for Manifest V3, with no runtime module imports. Manifest, popup and recovery injection names resolve inside the generated folder. Source JS copies are not maintained. Auxiliary scripts and tests remain CommonJS.

`npm test` builds and tests the executable JS, including all 106 original scenarios, malformed messages, uncertain responses, artifact references and compiler rejection of mismatched contracts. AST-based fixture extraction is independent of TypeScript formatting. `npm run check:store` repeats the suites against the packaged extension.

Features: copy job details and descriptions, send to an open ChatGPT tab, save to a selected Google Sheets cell, dismiss/restore jobs, Previous/Next navigation, native Apply/Easy Apply, Applied-card hiding (on by default, configurable in the popup), optional post-apply dialog closing. Successful Sheets saves also advance to the next job.

Manual acceptance: [VERIFY.md](VERIFY.md). Listing: [STORE_LISTING.md](STORE_LISTING.md). Privacy: [PRIVACY.md](PRIVACY.md).

The local automation extension is maintained separately at `X:\Coding Projects\Auto Job Apply\extensions\linkedin-mcp`. This Store build does not contain its bridge, journal, pairing UI or localhost permission. Disable the other extension when checking manual buttons to avoid duplicates.

Copied/sent job headers include visible salary, workplace and employment-type chips when available.
