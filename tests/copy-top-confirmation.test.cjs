const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
function functionSource(start, end) {
  return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
}

function setup({ copied = true, action = 'top', present = true, href = '?currentJobId=123', hidden = false, disabled = false, sheets = false } = {}) {
  let handler;
  let clicks = 0;
  let finishCopy;
  const yes = {
    disabled,
    getAttribute: (name) => name === 'href' ? href : null,
    click: () => { clicks += 1; }
  };
  const surface = { querySelectorAll: (selector) => {
    assert.match(selector, /aria-label="Did you finish applying\? Yes"/);
    return present ? [yes] : [];
  } };
  const button = { dataset: {}, removeAttribute() {}, addEventListener: (_, callback) => { handler = callback; } };
  const context = vm.createContext({
    URL, document: { createElement: () => button }, location: { origin: 'https://www.linkedin.com' },
    jobId: '123', surface, getCurrentJobId: () => context.jobId,
    getJobSurface: () => context.surface, isVisible: () => !hidden,
    buildTopClipboardText: () => 'Job text',
    setButtonState() {},
    celebrateSheetsSuccess() {},
    openNextJobAfterSheets: async (jobId, report) => {
      if (context.jobId === jobId) context.advanced = true;
      report('Navigation reached.');
    },
    chrome: { runtime: { sendMessage: () => new Promise((resolve) => {
      finishCopy = () => resolve({ ok: copied, code: 'SHEETS_PASTE_FAILED', cell: 'A1', nextCell: 'A2' });
    }) } },
    copyToClipboard: () => new Promise((resolve) => { finishCopy = () => resolve(copied); }),
    BUTTON_CLASS: 'copy', RUN_ID: 'test', TOP_ACTION_ID: 'top'
  });
  vm.runInContext(functionSource('  function confirmExternalApplication(', '  async function copyToClipboard(')
    + functionSource('  function createCopyButton(', '  function createChatGptButton(')
    + functionSource('  async function sendToSheets(', '  function createSheetsButton(')
    + `createCopyButton('Copy', '', '${action}', () => 'job');`, context);
  return {
    context, button, clicks: () => clicks,
    click: () => sheets ? context.sendToSheets(button) : handler({ preventDefault() {}, stopPropagation() {} }),
    finish: () => finishCopy()
  };
}

test('Copy & confirm confirms the supplied external-apply link only after copying', async () => {
  const fixture = setup();
  const pending = fixture.click();
  assert.equal(fixture.clicks(), 0);
  fixture.finish();
  await pending;
  assert.equal(fixture.clicks(), 1);
});

for (const [name, options] of [
  ['Easy Apply without confirmation', { present: false }],
  ['Copy description', { action: 'description' }],
  ['failed clipboard copy', { copied: false }],
  ['another job confirmation', { href: '?currentJobId=456' }],
  ['hidden confirmation', { hidden: true }],
  ['disabled confirmation', { disabled: true }]
]) {
  test(`${name} does not confirm`, async () => {
    const fixture = setup(options);
    const pending = fixture.click();
    fixture.finish();
    await pending;
    assert.equal(fixture.clicks(), 0);
  });
}

test('switching jobs while copying does not confirm the next job', async () => {
  const fixture = setup();
  const pending = fixture.click();
  fixture.context.jobId = '456';
  fixture.finish();
  await pending;
  assert.equal(fixture.clicks(), 0);
});

test('To Sheets confirms Yes only after a successful transfer', async () => {
  const fixture = setup({ sheets: true });
  const pending = fixture.click();
  assert.equal(fixture.clicks(), 0);
  fixture.finish();
  await pending;
  assert.equal(fixture.clicks(), 1);
});

test('a failed Sheets transfer does not confirm Yes', async () => {
  const fixture = setup({ sheets: true, copied: false });
  const pending = fixture.click();
  fixture.finish();
  await pending;
  assert.equal(fixture.clicks(), 0);
  assert.equal(fixture.context.advanced, undefined);
});

test('To Sheets does not confirm another job selected while sending', async () => {
  const fixture = setup({ sheets: true });
  const pending = fixture.click();
  fixture.context.jobId = '456';
  fixture.finish();
  await pending;
  assert.equal(fixture.clicks(), 0);
});

test('To Sheets succeeds without an external-apply confirmation', async () => {
  const fixture = setup({ sheets: true, present: false });
  const pending = fixture.click();
  fixture.finish();
  await pending;
  assert.equal(fixture.clicks(), 0);
  assert.equal(fixture.context.advanced, true);
  assert.match(fixture.button.title, /Sheets navigation v3\nWritten to A1; selected A2\.\nNavigation reached\./);
});
