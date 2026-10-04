# Chrome Web Store Listing Draft

## Name

LinkedIn Job Text Copier

## Summary

Copy LinkedIn job details or send a description to ChatGPT with one click.

## Overview

Adds copy buttons to LinkedIn job pages.

LinkedIn Job Text Copier adds simple copy buttons to LinkedIn Jobs pages so you can quickly save job details and descriptions.

What it does:

- Adds a `Copy top` button near the job action buttons.
- Adds a `Copy description` button next to `Copy top` in the expanded job header.
- Adds a `Send to ChatGPT` button that submits the same full job text to an already open ChatGPT tab without overwriting a draft.
- Supports classic LinkedIn Jobs pages and the newer AI/semantic search job details layout.
- Copies clean, readable job information without LinkedIn tracking parameters.
- Includes an optional popup setting to auto-close LinkedIn's post-apply confirmation popup.

`Copy top` copies:

- Company name
- Job title
- Primary job metadata such as location, reposted date, and applicant activity
- Clean LinkedIn job URL

`Copy description` copies:

- Company name
- Job title
- Primary job metadata such as location, reposted date, and applicant activity
- Visible About the job text

This is useful when you want to save vacancies, compare roles, send a vacancy into an existing ChatGPT workflow, and prepare tailored applications.

Privacy:

The extension runs locally in your browser. It does not collect, sell, or share data with the extension developer or any developer-controlled service. Job text is passed to ChatGPT only after the user clicks `Send to ChatGPT`. It stores only extension preferences, such as whether the optional post-apply popup auto-close setting is enabled.

## Category

Productivity

## Single Purpose

Moves visible LinkedIn job information to the local clipboard or, after an explicit button click, to an open ChatGPT conversation.

## Permission Justification

### activeTab

The `activeTab` permission lets the extension popup communicate with the currently active LinkedIn Jobs tab when the user clicks `Refresh buttons` or changes the optional auto-close setting. It is used only for the active tab and only to refresh the extension's injected copy buttons or notify the tab about the saved setting.

### storage

The `storage` permission saves extension preferences, including whether the optional `Auto-close applied popup` setting is enabled. It does not store job content, LinkedIn profile data, application data, or browsing history.

### ChatGPT site access

Access to `chatgpt.com` and the legacy `chat.openai.com` host lets the background worker find an already open matching tab and lets the ChatGPT content script fill and submit the composer only after the user clicks `Send to ChatGPT`. The extension does not read conversation history or overwrite a non-empty draft.

## Remote Code

No remote code is used.

## Data Collection

No user data is collected by the extension developer. Job text is submitted to ChatGPT only after an explicit user action and is then handled under OpenAI's terms and privacy policy.

## Test Instructions

1. Install the extension.
2. Open a LinkedIn Jobs search result page.
3. Select any job.
4. Click `Copy top` near the job action buttons.
5. Click `Copy description` next to `Copy top` while the expanded job header is visible.
6. Paste into a text editor and confirm that the copied content matches the visible job information.
7. Open a blank ChatGPT composer in the same browser profile, click `Send to ChatGPT`, and confirm the job text is submitted.
8. Put a draft in the ChatGPT composer, click `Send to ChatGPT`, and confirm the extension leaves the draft untouched.
9. Open the extension popup, enable `Auto-close applied popup`, apply to a job, and confirm LinkedIn's post-apply confirmation is dismissed.
