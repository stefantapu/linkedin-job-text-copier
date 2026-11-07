const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { checkArtifact } = require('./check-artifact.cjs');

const root = path.resolve(__dirname, '..');
const extension = path.join(root, 'dist', 'chrome-web-store', 'extension');
checkArtifact(extension);
const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.ok(manifest.name.length <= 75);
assert.ok(manifest.description.length <= 132);
assert.deepEqual(manifest.permissions.slice().sort(),
  ['activeTab', 'clipboardRead', 'clipboardWrite', 'scripting', 'storage'].sort());
const referenced = [manifest.background.service_worker, manifest.action.default_popup,
  ...Object.values(manifest.icons),
  ...manifest.content_scripts.flatMap((script) => [...(script.js || []), ...(script.css || [])])];
for (const file of referenced) assert.ok(fs.existsSync(path.join(extension, file)), `Missing ${file}`);
function inspect(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) { inspect(file); continue; }
    assert.doesNotMatch(file, /mcp|journal|traversal/i);
    if (entry.name.endsWith('.png')) continue;
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /mcp|127\.0\.0\.1|localhost|LjtcTraversal|LjtcJournal/i, file);
    if (entry.name.endsWith('.js')) new vm.Script(source, { filename: file });
  }
}
inspect(extension);

// Run the same suites against the packaged artifact, using repository tooling.
const tests = fs.readdirSync(path.join(root, 'tests')).filter(file => file.endsWith('.test.cjs'));
const result = spawnSync(process.execPath, ['--test', ...tests.map(file => path.join(root, 'tests', file))], {
  encoding: 'utf8', env: { ...process.env, LJTC_EXTENSION_DIR: extension }
});
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
