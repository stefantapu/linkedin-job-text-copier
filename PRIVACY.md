# Privacy Policy

LinkedIn Job Text Copier does not collect, sell, or share user data with the extension developer or any developer-controlled service.

The extension runs on LinkedIn Jobs pages and adds action buttons to the page. When a user clicks a copy button, the extension reads visible job information from the current page and writes it to the local clipboard.

When a user explicitly clicks `Send to ChatGPT`, the extension passes that visible job text directly between its local browser components, inserts it into the most recently used open ChatGPT tab, and submits it. The extension does not open a ChatGPT tab automatically and does not overwrite a non-empty ChatGPT draft.

The extension stores only local extension preferences, such as whether the optional post-apply popup auto-close toggle is enabled.

When a user explicitly clicks `To Sheets`, the extension sends the same top-of-job text to the most recently used open Google Sheets spreadsheet in that browser profile. It activates that tab, writes the text to the clipboard, encodes the job text as one table cell and pastes into the selected cell and checks that the selection moved to the cell below. Existing content in the chosen cell is replaced. The extension uses Google Sheets site access and clipboard read/write permissions for this action only; it does not monitor or store clipboard contents. Google's handling of spreadsheet content is governed by Google's own terms and privacy policy.

The extension does not use analytics, remote code, external servers controlled by the extension developer, or background network requests. Job text is sent to ChatGPT only through the visible ChatGPT page after the user clicks the dedicated button; ChatGPT's own handling of submitted content is governed by OpenAI's terms and privacy policy.
