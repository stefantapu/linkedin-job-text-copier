# LinkedIn Job Text Copier

Chrome/Edge extension that adds copy buttons to LinkedIn job pages.

## What it does

- Adds `Copy description` next to the `About the job` heading.
- Adds `Copy top` next to the top share button.
- `Copy top` copies company, job title, primary job metadata, and a clean LinkedIn job URL.
- `Copy description` copies job title, location, and the `About the job` text.
- Re-injects buttons when LinkedIn changes the selected job without a full page reload.

## Install locally

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select this folder.
5. Open a LinkedIn jobs page and select a vacancy.

## Files

- `manifest.json` - Manifest V3 config.
- `content.js` - DOM detection, button injection, and clipboard logic.
- `styles.css` - LinkedIn-like button styling.
- `icons/` - Extension icons.
- `PRIVACY.md` - Privacy policy text for publishing.

## Chrome Web Store notes

The extension has a narrow single purpose: copying visible LinkedIn job information to the local clipboard.

Suggested privacy answers:

- Remote code: No.
- Data collection: No user data is collected.
- Permission justification: the extension uses a LinkedIn Jobs host match so it can add copy buttons to job pages.
