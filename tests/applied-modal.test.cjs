const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const functions = source.slice(source.indexOf('  function isPostApplyModalText('),
  source.indexOf('  function scheduleDismissAppliedModal('));
const sentText = 'Your application was sent to Modjo! You can keep track of your application in the "Applied" tab of My Jobs Next, continue your search There are more jobs similar to this one.';

function setup({ kind = 'dialog', text = sentText, enabled = true, visible = true, disabled = false, dismissButton = true, shadow = false } = {}) {
  let clicks = 0;
  const body = { parentElement: null };
  const button = {
    innerText: dismissButton ? '' : 'Not now', disabled, visible,
    getAttribute: () => null,
    click: () => { clicks += 1; }
  };
  const modal = {
    innerText: text, textContent: text, visible, parentElement: body,
    // The supplied native dialog has a top-level Dismiss button and nested toast dismissals.
    querySelector: () => dismissButton ? button : null,
    querySelectorAll: () => [button]
  };
  button.parentElement = modal;
  const modalRoot = {
    querySelectorAll: (selector) => {
      if (selector === 'button') return [button];
      if (kind === 'legacy') return [modal];
      if (kind === 'dialog' && /(^|,\s*)dialog\b/.test(selector)) return [modal];
      if (kind === 'aria-modal' && selector.includes('[aria-modal="true"]')) return [modal];
      return [];
    }
  };
  const document = shadow ? { body, querySelectorAll: () => [], getElementById: () => ({ shadowRoot: modalRoot }) }
    : { ...modalRoot, body, getElementById: () => null };
  const context = vm.createContext({
    document, autoDismissAppliedModal: enabled, isJobsPage: () => true,
    isVisible: (node) => node.visible,
    normalizeText: (value) => value.replace(/\s+/g, ' ').trim(),
    getVisibleText: (node) => node.innerText
  });
  vm.runInContext(functions, context);
  return { context, modalRoot, dismiss: () => context.dismissAppliedModal(), clicks: () => clicks,
    setText: (value) => { modal.innerText = modal.textContent = value; } };
}

test('closes the supplied Easy Apply confirmation inside interop-outlet shadow root', () => {
  const fixture = setup({ kind: 'legacy', shadow: true,
    text: 'Next best action Your application was sent to Groupe iliad! You can keep track of your application in the "Applied" tab of My Jobs Turn your resume into a profile that recruiters notice Not now Update profile' });
  fixture.dismiss();
  assert.equal(fixture.clicks(), 1);
});

test('leaves an unfinished Easy Apply form inside the shadow root open', () => {
  const fixture = setup({ kind: 'legacy', shadow: true, text: 'Review your application Submit application' });
  fixture.dismiss();
  assert.equal(fixture.clicks(), 0);
});

test('observes a late-attached shadow root and dismisses when its form becomes a confirmation', () => {
  const fixture = setup({ kind: 'legacy', shadow: true, text: 'Review your application' });
  const observed = new Map();
  let callback;
  fixture.context.document.getElementById = () => null;
  fixture.context.MutationObserver = class {
    constructor(handler) { callback = handler; }
    observe(root, options) { observed.set(root, options); }
  };
  fixture.context.scheduleEnhance = () => {};
  fixture.context.scheduleDismissAppliedModal = () => fixture.dismiss();
  vm.runInContext(source.slice(source.indexOf('  const observer = new MutationObserver('),
    source.indexOf('  window.setInterval(() => {', source.indexOf('  const observer = new MutationObserver('))), fixture.context);
  assert.equal(observed.size, 1);
  fixture.context.document.getElementById = () => ({ shadowRoot: fixture.modalRoot });
  fixture.context.observeAppliedModalRoots();
  assert.equal(observed.size, 2);
  assert.equal(fixture.clicks(), 0);
  fixture.setText(sentText);
  assert.equal(observed.get(fixture.modalRoot).characterData, true);
  callback([{ type: 'characterData' }]);
  assert.equal(fixture.clicks(), 1);
  fixture.context.observeAppliedModalRoots();
  assert.equal(observed.size, 2);
});

for (const kind of ['legacy', 'dialog', 'aria-modal']) {
  test(`closes screenshot confirmation in ${kind} container with toggle on`, () => {
    const fixture = setup({ kind });
    fixture.dismiss();
    assert.equal(fixture.clicks(), 1);
  });
}

test('falls back to Not now when the dialog has no Dismiss button', () => {
  const fixture = setup({ dismissButton: false });
  fixture.dismiss();
  assert.equal(fixture.clicks(), 1);
});

test('dismisses during the mutation callback, before a timer can allow a paint', () => {
  const fixture = setup();
  fixture.context.dismissTimer = null;
  fixture.context.window = { setTimeout: () => 1 };
  vm.runInContext(source.slice(source.indexOf('  function scheduleDismissAppliedModal('),
    source.indexOf('  function scheduleEnhance(')), fixture.context);
  fixture.context.scheduleDismissAppliedModal();
  assert.equal(fixture.clicks(), 1);
});

for (const [name, options] of [
  ['toggle off', { enabled: false }],
  ['hidden confirmation', { visible: false }],
  ['disabled dismissal', { disabled: true }],
  ['application form', { text: 'Submit your application to Modjo! Next, continue your search' }],
  ['unrelated dialog', { text: 'There are more jobs similar to this one. Not now' }]
]) {
  test(`leaves ${name} untouched`, () => {
    const fixture = setup(options);
    fixture.dismiss();
    assert.equal(fixture.clicks(), 0);
  });
}
