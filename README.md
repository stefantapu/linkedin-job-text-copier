<img width="714" height="701" alt="Screenshot 2026-06-dasd03 214607" src="https://github.com/user-attachments/assets/b88a1666-4556-4e7d-b496-7b803f52f334" />
# LinkedIn Job Text Copier

Chrome/Edge extension that adds copy buttons to LinkedIn job pages.

## What it does

- Adds `Copy description` next to the `About the job` heading.
- Adds `Copy top` next to the top share button.
- `Copy top` copies company, job title, primary job metadata, and a clean LinkedIn job URL.
- `Copy description` copies job title, location, and the `About the job` text.
- Supports both classic LinkedIn Jobs pages and the newer AI/semantic search job details layout.
- Re-injects buttons when LinkedIn changes the selected job or navigates to Jobs without a full page reload.
- Includes a popup refresh button that can refresh buttons or reload the current LinkedIn Jobs tab.
- Optional popup toggle: auto-close LinkedIn's "Added to your applied jobs" post-apply confirmation.

## Install locally

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select this folder.
5. Open a LinkedIn jobs page and select a vacancy.

## Files

- `manifest.json` - Manifest V3 config.
- `content.js` - DOM detection, button injection, and clipboard logic.
- `popup.html`, `popup.css`, `popup.js` - extension popup refresh control and optional post-apply popup toggle.
- `styles.css` - LinkedIn-like button styling.
- `icons/` - Extension icons.
- `PRIVACY.md` - Privacy policy text for publishing.

## Chrome Web Store notes

The extension has a narrow single purpose: copying visible LinkedIn job information to the local clipboard.

Suggested privacy answers:

- Remote code: No.
- Data collection: No user data is collected.
- Permission justification: the extension runs on LinkedIn so it can detect SPA navigation into Jobs pages, then stays inactive outside `/jobs` URLs.
- Storage permission: saves only extension preferences, including the optional post-apply popup toggle.
