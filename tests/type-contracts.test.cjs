const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

test('compiler enforces endpoint requests, replies and settings at both boundaries', () => {
  const root = path.resolve(__dirname, '..');
  const folder = fs.mkdtempSync(path.join(root, 'dist', 'contract-check-'));
  const imports = `import { sendRuntime, sendTab, listen, sendSheets, sendChatGpt, settingsUpdated } from '../../src/contracts';\n`;
  const valid = [
    `sendRuntime(sendChatGpt, { type: 'LJTC_SEND_TO_CHATGPT', text: 'Job' });`,
    `sendTab(sendSheets, 1, { type: 'LJTC_SEND_TO_SHEETS', text: 'Job' });`,
    `listen(sendSheets, (_request, _sender, reply) => { reply({ ok: true, cell: 'A1', nextCell: 'A2' }); return false; });`
  ];
  const invalid = [
    `sendRuntime(sendChatGpt, { type: 'LJTC_SEND_TO_CHATGPT', text: 123 });`,
    `sendTab(sendSheets, 1, { type: 'LJTC_SEND_TO_CHATGPT', text: 'Job' });`,
    `sendRuntime(settingsUpdated, { type: 'LJTC_SETTINGS_UPDATED', settings: { hideAppliedJobs: 'false' } });`,
    `listen(sendSheets, (_request, _sender, reply) => { reply({ ok: true }); return false; });`,
    `listen(sendChatGpt, (_request, _sender, reply) => { reply({ ok: false, code: 'SHEETS_BUSY' }); return false; });`
  ];
  fs.writeFileSync(path.join(folder, 'tsconfig.json'), JSON.stringify({ extends: '../../tsconfig.json',
    include: ['fixture.ts', '../../src/globals.d.ts'] }));
  const tsc = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
  function compile(lines) {
    fs.writeFileSync(path.join(folder, 'fixture.ts'), imports + lines.join('\n'));
    return spawnSync(process.execPath, [tsc, '-p', folder, '--pretty', 'false'], { encoding: 'utf8' });
  }
  try {
    const success = compile(valid);
    assert.equal(success.status, 0, success.stdout + success.stderr);
    const failure = compile(invalid);
    assert.notEqual(failure.status, 0);
    // Every invalid call must fail on its own source line, not merely one call.
    for (let line = 2; line <= invalid.length + 1; line++) {
      assert.match(failure.stdout, new RegExp(`fixture\\.ts\\(${line},`), failure.stdout + failure.stderr);
    }
  } finally {
    assert.equal(path.dirname(folder), path.join(root, 'dist'));
    assert.ok(path.basename(folder).startsWith('contract-check-'));
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
