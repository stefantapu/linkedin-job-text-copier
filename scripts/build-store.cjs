const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'chrome-web-store');
const extension = path.join(output, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const files = ['manifest.json', 'background.js', 'content.js', 'chatgpt.js', 'sheets.js', 'styles.css', 'popup.html', 'popup.css', 'popup.js'];
fs.mkdirSync(extension, { recursive: true });
assert.ok(fs.readdirSync(extension).every(name => files.includes(name) || name === 'icons'), 'Unexpected output file; inspect before building');
for (const name of files) {
  const source = fs.readFileSync(path.join(root, name), 'utf8');
  assert.doesNotMatch(source, /mcp|127\.0\.0\.1|localhost|LjtcTraversal|LjtcJournal/i, name);
  fs.writeFileSync(path.join(extension, name), source);
}
fs.mkdirSync(path.join(extension, 'icons'), { recursive: true });
for (const name of Object.values(manifest.icons)) fs.copyFileSync(path.join(root, name), path.join(extension, name));
for (const name of ['README.md', 'PRIVACY.md', 'STORE_LISTING.md', 'VERIFY.md']) fs.copyFileSync(path.join(root, name), path.join(output, name));
console.log('Store version ' + manifest.version + ': ' + extension);
