# Chrome Web Store listing — 0.5.1

## Name

LinkedIn Job Text Copier

## Short description

Copy LinkedIn job details and descriptions, save jobs to Google Sheets, or send them to an open ChatGPT tab.

## Detailed description

Save and organize the LinkedIn jobs you are reviewing with buttons directly on the job page.

• Copy & mark applied — copy company, job title, primary metadata and a clean LinkedIn job URL. If LinkedIn shows “Did you finish applying?” for that external application, the button also clicks the available Yes confirmation.

• Copy description — copy company, title, primary metadata and the full available About the job text, without the job URL.

• Save to Sheets — save the same job details and URL in the selected single cell of your most recently used open Google Sheets spreadsheet. Multiline text stays in one cell. After a successful transfer, selection moves down one row, you return to LinkedIn, and any available Yes application confirmation for that job is clicked.

• Send to ChatGPT — insert and submit the job description in your most recently used open ChatGPT tab in the same browser profile. Existing drafts are preserved.

• Hide job / Restore job — use LinkedIn's native controls to hide or restore the selected vacancy.

• Optional auto-close — dismiss recognized LinkedIn post-apply confirmation popups and dialogs.

• Refresh buttons — restore the extension's buttons from its popup. Supports classic Jobs pages and newer AI/semantic search job layouts, including navigation between vacancies without a full reload.

Before using Save to Sheets, select one cell, finish editing and keep the formula bar visible. The selected cell's value will be replaced. If the extension says “Check Sheets”, inspect the spreadsheet before retrying.

ChatGPT and Google Sheets must already be open in the same browser profile. No API key is needed. Sending to ChatGPT submits a message; copying a job or opening an application does not submit a job application.

Privacy: no analytics, remote code or developer-controlled data servers. Job text goes to the clipboard, ChatGPT or Google Sheets only when you use the corresponding button. The auto-close preference may sync through Chrome. Google and OpenAI handle content sent to their services under their own policies.

Independent extension; not affiliated with or endorsed by LinkedIn, Google or OpenAI.

## Single purpose

Help users capture and organize the LinkedIn job they are reviewing by copying visible job information or sending it to an already open Google Sheets spreadsheet or ChatGPT conversation, with related native job-review controls.

## Permission explanations

- `activeTab`: identify the active LinkedIn Jobs tab for popup refresh and setting notifications.
- `storage`: save the optional auto-close preference; no job content or application history is stored.
- `clipboardWrite`: copy job text and prepare the single-cell Sheets paste.
- `clipboardRead`: allow the native clipboard paste into Sheets during a requested transfer; no clipboard monitoring.
- `scripting`: restore the bundled ChatGPT or Sheets content script when an open tab has no message receiver.
- LinkedIn site access (`www.linkedin.com`): inject buttons, read visible job text and use native dismiss, undo and application-confirmation controls. Broad content-script matching allows detection when navigating to Jobs from another LinkedIn page without a full page load; job actions run on Jobs pages.
- ChatGPT site access (`chatgpt.com`, legacy `chat.openai.com`): find an open tab and insert/submit text after the dedicated button click, preserving existing drafts.
- Google Sheets site access (`docs.google.com/spreadsheets/*`): find an open spreadsheet, paste into one selected cell and check the resulting selection.

## Privacy and remote code disclosures

No remote executable code. No user data is collected by the developer. Visible job text is processed locally and sent to the user's selected destination through an explicit button action. Describe these destination transfers consistently with `PRIVACY.md` when completing the dashboard disclosures.

## Reviewer instructions

Use `VERIFY.md`. A signed-in LinkedIn session with available job listings is needed for job buttons. Signed-in ChatGPT and an editable Google Sheets spreadsheet are needed only for their respective optional integrations. No extension account, API key, local server or pairing is needed.
