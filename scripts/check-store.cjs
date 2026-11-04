const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const extension = path.join(root, 'dist', 'chrome-web-store', 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
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

// Run the existing manual-feature suites against the generated files, not the dev copy.
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ljtc-store-check-'));
try {
  fs.cpSync(extension, temporary, { recursive: true });
  fs.mkdirSync(path.join(temporary, 'tests'));
  const tests = fs.readdirSync(path.join(root, 'tests'))
    .filter((file) => file.endsWith('.test.cjs') && !['mcp.test.cjs', 'apply-job.test.cjs', 'traversal.test.cjs'].includes(file));
  for (const file of tests) fs.copyFileSync(path.join(root, 'tests', file), path.join(temporary, 'tests', file));
  const result = spawnSync(process.execPath, ['--test', ...tests.map((file) => path.join(temporary, 'tests', file))],
    { encoding: 'utf8', env: { ...process.env, LJTC_STORE_BUILD: '1' } });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temporary).startsWith('ljtc-store-check-'));
  fs.rmSync(temporary, { recursive: true, force: true });
}
