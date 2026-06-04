# Chrome Web Store Listing Draft

## Name

LinkedIn Job Text Copier

## Summary

Copy LinkedIn job details and descriptions with one click.

## Description

LinkedIn Job Text Copier adds two small copy buttons to LinkedIn Jobs pages.

The top button copies the company name, job title, primary job metadata, and a clean job URL.

The description button copies the job title, location, and visible About the job text.

The extension also has an optional popup toggle that can dismiss LinkedIn's post-apply confirmation popup.

The extension works locally in the browser. It does not collect, transmit, or sell user data.

## Category

Productivity

## Single Purpose

Adds copy buttons to LinkedIn job pages so users can copy visible job information to their local clipboard.

## Permission Justification

The extension runs on LinkedIn so it can detect navigation into Jobs pages, add copy buttons, read visible job text when the user clicks a copy button, and optionally dismiss LinkedIn's post-apply confirmation popup.

The `storage` permission saves only the optional popup toggle state.

## Remote Code

No remote code is used.

## Data Collection

No user data is collected.

## Test Instructions

1. Install the extension.
2. Open a LinkedIn Jobs search result page.
3. Select any job.
4. Click `Copy top` near the Share button.
5. Click `Copy description` near the About the job heading.
6. Paste into a text editor and confirm that the copied content matches the visible job information.
7. Open the extension popup, enable `Auto-close applied popup`, apply to a job, and confirm LinkedIn's post-apply confirmation is dismissed.
