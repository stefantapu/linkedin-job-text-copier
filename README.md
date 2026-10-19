<img width="714" height="701" alt="Screenshot 2026-06-dasd03 214607" src="https://github.com/user-attachments/assets/b88a1666-4556-4e7d-b496-7b803f52f334" />
# LinkedIn Job Text Copier

Chrome/Edge/Brave extension that adds copy buttons to LinkedIn job pages.

## What it does

- Adds `Copy description` next to `Copy & confirm` in the expanded job header, while keeping it out of the compact sticky bar.
- Adds `Copy & confirm` next to the top share button.
- `Copy & confirm` copies company, job title, primary job metadata, and a clean LinkedIn job URL.
- After copying, `Copy & confirm` also clicks an available `Did you finish applying? Yes` confirmation for the current external-apply job.
- `To Sheets` copies the same text into the selected single cell of the most recently used open Google Sheets spreadsheet, then selects the cell below and returns to LinkedIn. Embedded newlines stay inside that one cell. After a successful transfer, it also clicks an available Yes application confirmation for the same LinkedIn job.
- Before using `To Sheets`, select one cell in Sheets, finish any cell editing, and keep the formula bar visible. The selected cell's existing value is replaced. On `Check Sheets`, inspect the table before retrying; uncertain writes are never retried automatically.
- `Copy description` copies the same company, title, and primary metadata without the job URL, followed by the full `About the job` text.
- `Send to ChatGPT` sends that same full job text to the most recently used open ChatGPT tab and submits it. It refuses to overwrite an existing draft.
- If the ChatGPT content script is missing, the button reconnects it automatically. Hover over an error label for details; if text was inserted but could not be submitted, send the draft from ChatGPT.
- Message-field detection supports known ChatGPT fields and a single visible textarea or semantic editor inside a main-page form. It waits up to three seconds for the field to appear, preserves drafts, and refuses ambiguous fields. Error tooltips show the selected ChatGPT tab URL.
- Auto-send recognizes the current `data-composer-submit` control, the submit-button ID, a plain submit button labelled `Send`, and legacy send markers. It supports localized labels and skips controls that are disabled or showing Stop instead of Send.
- Supports both classic LinkedIn Jobs pages and the newer AI/semantic search job details layout.
- Re-injects buttons when LinkedIn changes the selected job or navigates to Jobs without a full page reload.
- Includes a popup refresh button that can refresh buttons or reload the current LinkedIn Jobs tab.
- Optional popup toggle: auto-close LinkedIn's "Added to your applied jobs" post-apply confirmation.

## Install locally

1. Open `chrome://extensions`, `edge://extensions`, or `brave://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select this folder.
5. Open a LinkedIn jobs page and select a vacancy.

After updating these files, click Reload on this extension's card in your browser's extensions page, then refresh LinkedIn. ChatGPT must be open in the same browser profile, with site access enabled for this extension.

For `To Sheets`, also refresh the Sheets tab. Version 0.3.0 adds access to `docs.google.com/spreadsheets/*` and clipboard read/write permissions for native paste of a single table cell. Multiline text is encoded as one quoted TSV field without HTML formatting, preserving the cell background. After the paste, Arrow Down moves the grid selection one row and the name box is checked. Clipboard access is used only during a requested transfer; there is no clipboard monitoring. No Google API key or account authorization is needed.

## Validation

Run `node --test tests/chatgpt-relay.test.cjs` to check missing-script recovery, single submission, draft protection, and error messages. These tests simulate the browser APIs and composer; a live browser check is still needed after loading the extension.

Run `node --test tests/*.test.cjs` for all local checks, including the Sheets relay and DOM simulation. For a live Sheets check: select an empty cell, click `To Sheets`, confirm all job text occupies that one cell and the selection moved down one row, then repeat with another vacancy. Also check range selection rejection and read-only sheets. Local simulations do not verify Google Sheets' current editor behavior.

For real DOM checks, run `node tests/composer-browser-server.cjs` and open `http://127.0.0.1:8765/`. This local fixture checks textarea and contenteditable variants, hidden fields, form-scoped submit buttons, drafts, ambiguous fields, and delayed rendering. It uses a mocked extension message receiver and sends no text to ChatGPT. Add `?baseline` to reproduce the old immediate, ID-based composer lookup.

## Files

- `manifest.json` - Manifest V3 config.
- `content.js` - DOM detection, button injection, and clipboard logic.
- `background.js` - relays a user-requested job text from LinkedIn to an open ChatGPT tab.
- `chatgpt.js` - fills and submits the ChatGPT composer.
- `sheets.js` - pastes into the selected Google Sheets cell and checks that the selection moved to the next row.
- `popup.html`, `popup.css`, `popup.js` - extension popup refresh control and optional post-apply popup toggle.
- `styles.css` - LinkedIn-like button styling.
- `icons/` - Extension icons.
- `PRIVACY.md` - Privacy policy text for publishing.

## Chrome Web Store notes

The extension has a narrow single purpose: moving visible LinkedIn job information to the clipboard or an open ChatGPT conversation at the user's request.

Suggested privacy answers:

- Remote code: No.
- Data collection: No user data is collected.
- Site access justification: the extension runs on LinkedIn to read the selected job after a button click and on ChatGPT to insert and submit that text after the user clicks `Send to ChatGPT`.
- Storage permission: saves only extension preferences, including the optional post-apply popup toggle.
