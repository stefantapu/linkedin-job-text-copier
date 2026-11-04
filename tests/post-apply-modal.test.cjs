const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');

function fixture({ enabled = true, text = 'Your application was sent to Capitole! Next, continue your search', tag = 'dialog', hidden = false } = {}) {
  let clicks = 0;
  const button = { click() { clicks++; }, textContent: 'Not now' };
  const modal = { innerText: text, querySelector: () => null, querySelectorAll: () => [button] };
  const context = vm.createContext({
    autoDismissAppliedModal: enabled, isJobsPage: () => true, isVisible: () => !hidden,
    normalizeText: (s) => s, getVisibleText: (node) => node.textContent,
    document: { querySelectorAll: (selector) => tag === 'dialog'
      ? (selector.split(',').some((s) => /^dialog(?:\[open\])?$/.test(s.trim())) ? [modal] : [])
      : [modal] }
  });
  vm.runInContext(source.slice(source.indexOf('  function isPostApplyModalText('),
    source.indexOf('  function scheduleDismissAppliedModal(')), context);
  return { run: () => context.dismissAppliedModal(), clicks: () => clicks };
}

test('closes the native dialog from the supplied LinkedIn post-apply markup', () => {
  const page = fixture();
  assert.equal(page.run(), 1);
  assert.equal(page.clicks(), 1);
});

for (const [name, options] of [
  ['disabled preference', { enabled: false }],
  ['hidden modal', { hidden: true }],
  ['application form', { text: 'Apply to Capitole Next, continue your search' }],
  ['unrelated dialog', { text: 'Discard your application? Not now' }]
]) test(`does not close ${name}`, () => assert.equal(fixture(options).run(), 0));

test('still closes legacy post-apply dialogs', () => {
  assert.equal(fixture({ tag: 'div', text: 'Added to your applied jobs Next, continue your search' }).run(), 1);
});
