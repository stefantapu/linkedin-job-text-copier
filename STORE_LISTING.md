# Chrome Web Store Listing Draft

## Name

LinkedIn Job Text Copier

## Summary

Copy LinkedIn job details and descriptions with one click.

## Overview

Adds copy buttons to LinkedIn job pages.

LinkedIn Job Text Copier adds simple copy buttons to LinkedIn Jobs pages so you can quickly save job details and descriptions.

What it does:

- Adds a `Copy top` button near the job action buttons.
- Adds a `Copy description` button near the About the job section.
- Supports classic LinkedIn Jobs pages and the newer AI/semantic search job details layout.
- Copies clean, readable job information without LinkedIn tracking parameters.
- Includes an optional popup setting to auto-close LinkedIn's post-apply confirmation popup.

`Copy top` copies:

- Company name
- Job title
- Primary job metadata such as location, reposted date, and applicant activity
- Clean LinkedIn job URL

`Copy description` copies:

- Job title
- Location
- Visible About the job text

This is useful when you want to save vacancies, compare roles, paste job descriptions into notes or AI tools, and prepare tailored applications.

Privacy:

The extension runs locally in your browser. It does not collect, sell, transmit, or share user data. It stores only extension preferences, such as whether the optional post-apply popup auto-close setting is enabled.

## Category

Productivity

## Single Purpose

Adds copy buttons to LinkedIn job pages so users can copy visible job information to their local clipboard.

## Permission Justification

### activeTab

The `activeTab` permission lets the extension popup communicate with the currently active LinkedIn Jobs tab when the user clicks `Refresh buttons` or changes the optional auto-close setting. It is used only for the active tab and only to refresh the extension's injected copy buttons or notify the tab about the saved setting.

### storage

The `storage` permission saves extension preferences, including whether the optional `Auto-close applied popup` setting is enabled. It does not store job content, LinkedIn profile data, application data, or browsing history.

## Remote Code

No remote code is used.

## Data Collection

No user data is collected.

## Test Instructions

1. Install the extension.
2. Open a LinkedIn Jobs search result page.
3. Select any job.
4. Click `Copy top` near the job action buttons.
5. Click `Copy description` near the About the job heading.
6. Paste into a text editor and confirm that the copied content matches the visible job information.
7. Open the extension popup, enable `Auto-close applied popup`, apply to a job, and confirm LinkedIn's post-apply confirmation is dismissed.
