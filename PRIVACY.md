# Privacy Policy

LinkedIn Job Text Copier / Fast Apply Panel — Chrome Web Store version 0.5.2

The extension developer does not collect, receive, sell or retain your job text, browsing history, account details or conversation content. There are no developer-controlled servers, analytics or remotely loaded executable code.

The extension reads visible job information on LinkedIn to provide its buttons. Clicking `Copy & mark applied` writes company, title, primary metadata and a clean job URL to your clipboard. It also clicks an available native Yes confirmation for the same external application. `Copy description` copies company, title, primary metadata and the full available About the job text, without the URL.

Clicking `Send to ChatGPT` sends job description text through local extension messages to the most recently used open ChatGPT tab in the same browser profile, inserts the text and submits it. The extension does not open a conversation automatically or overwrite a non-empty draft. Text submitted to ChatGPT is handled by OpenAI under its own terms and privacy policy. The extension does not collect conversation history.

Clicking `Save to Sheets` transfers job details and the job URL to the selected single cell of the most recently used open Google Sheets spreadsheet in the same browser profile. The extension activates that tab, writes a single quoted text field to the clipboard, pastes it, and checks that selection moved to the cell below. Existing content in that cell is replaced. After success it returns to LinkedIn, clicks an available native Yes application confirmation for the same job, and opens the next remaining job when available. Clipboard read/write access is used during the requested transfer; clipboard contents are not monitored or retained. Spreadsheet content is handled by Google under its own terms and privacy policy.

`Hide job` and `Restore job` click LinkedIn's native controls for the selected job. The optional auto-close setting dismisses recognized post-apply confirmations; it does not submit applications.

`Previous` and `Next` navigate the remaining cards on the current results page. The extension reads visible application-status labels and automatically removes Applied cards from the local page view. It does not send a dismiss action for this filtering or store an application history. `Apply` / `Easy Apply` opens the native LinkedIn application action, which may open an external employer or applicant-tracking website. You complete and submit applications using that site's own controls and policies; this extension does not fill in or submit application forms. Native Yes confirmations do not verify receipt by an employer.

The extension stores its auto-close preference using Chrome extension storage. Chrome sync storage is used when available, so the preference may sync through your browser account; otherwise it stays in local extension storage. Job text is not saved in extension storage. Uninstalling removes local extension storage; clipboard text and content already submitted to ChatGPT or Sheets must be managed in those services or your clipboard separately.
