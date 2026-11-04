# Manual acceptance — 0.5.1

1. Disable the development copy. Load this repository root (or `dist/chrome-web-store/extension/`) using Load unpacked at `chrome://extensions`. Refresh the relevant service tabs. Check the extension card for errors.
2. Open the extension popup: only the auto-close toggle, Refresh buttons and status should appear. Check that the preference survives closing and reopening the popup.
3. Open LinkedIn Jobs, select a vacancy. Check Copy & mark applied, Copy description, Save to Sheets, Send to ChatGPT and Hide job. Switch vacancies without reloading; check buttons still target the selected job and are not duplicated.
4. Copy & mark applied: paste into a text editor. Check company, title, metadata, clean URL. If an external-apply “Did you finish applying?” prompt exists, use this only after actually applying and check that Yes is confirmed.
5. Copy description: paste and compare with About the job. Check that the full available description is included, with company/title/metadata and without the job URL.
6. In an editable Sheets spreadsheet, select one empty cell, finish editing and keep the formula bar visible. Click Save to Sheets from LinkedIn. Check one multiline cell, selection one row below, and return to LinkedIn. Repeat with another job. Check that a selected range is rejected; on uncertain results inspect before retrying. A non-empty target cell will be replaced.
7. Open a blank ChatGPT composer. Click Send to ChatGPT; check one submitted message with the selected job's description. Then create an unsent draft and repeat; check the draft is preserved. This step sends a real message.
8. Hide job: check the selected native job is dismissed. Restore job: check it is restored. Check no other vacancy changes.
9. Auto-close off: check a post-apply confirmation stays open. Auto-close on: check recognized confirmation closes. Check application forms and unrelated dialogs stay open.
10. Scroll into the compact job header, resize the window and switch between available classic/AI search layouts. Check placement and no overlapping/duplicated controls. Use Refresh buttons from the popup and check recovery.

Record any mismatch with the button label, page layout and expected result. Browser acceptance is pending; automated simulations cannot verify live service layouts.

11. In the selected job header: Apply/Easy Apply occupies the second row's third slot; Previous/Next with arrows occupy a full row underneath. At narrow widths, controls wrap without overlapping the title. Hide/Restore is gray with an eye-off/undo icon.
12. Previous/Next follows the remaining cards on this results page, including cards below the scroll viewport; no page wrapping. At the first/last card, the corresponding button is disabled. Hidden-by-CSS cards are skipped.
13. Cards with an Applied status are removed from the DOM automatically, including after LinkedIn rerenders or changes a status. No LinkedIn dismiss action is sent. Saved, Viewed and Easy Apply cards remain. If the selected card becomes Applied, both directions retain its former position. Reloading retrieves LinkedIn results again and the filter runs again.
14. Apply opens the same native action for the selected job: external site or Easy Apply form. Check both variants manually; it must not submit a form. Unavailable/closed jobs disable Apply.
