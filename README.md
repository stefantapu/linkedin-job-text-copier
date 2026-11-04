# LinkedIn Job Text Copier — Chrome Web Store

Standalone Store source, version 0.5.1. Load this repository root as an unpacked extension, or build the publication folder:

```powershell
node scripts/build-store.cjs
node scripts/check-store.cjs
```

Output: `dist/chrome-web-store/extension`. ZIP only that folder's contents for upload. Publication has not been performed.

Features: copy job details and descriptions, send to an open ChatGPT tab, save to a selected Google Sheets cell, dismiss/restore jobs, optional post-apply dialog closing.

Manual acceptance: [VERIFY.md](VERIFY.md). Listing: [STORE_LISTING.md](STORE_LISTING.md). Privacy: [PRIVACY.md](PRIVACY.md).

The local automation extension is maintained separately at `X:\Coding Projects\Auto Job Apply\extensions\linkedin-mcp`. This Store build does not contain its bridge, journal, pairing UI or localhost permission. Disable the other extension when checking manual buttons to avoid duplicates.
