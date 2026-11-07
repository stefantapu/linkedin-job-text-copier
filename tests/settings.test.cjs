const { readScript, section, initializer, extension } = require('./built-script.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const popup = readScript('popup.js');
const content = readScript('content.js');

function setup(saved = {}, failSave = false) {
  const elements = new Map();
  const messages = [];
  const document = { querySelector(id) {
    if (!elements.has(id)) elements.set(id, { checked: id === '#hideAppliedJobs', disabled: false,
      addEventListener(type, listener) { this[type] = listener; } });
    return elements.get(id);
  } };
  const context = vm.createContext({ document, URL, chrome: {
    storage: { sync: {
      async get(defaults) { return { ...defaults, ...saved }; },
      async set(values) { if (failSave) throw Error('unavailable'); Object.assign(saved, values); }
    } },
    tabs: { async query() { return [{ id: 7, url: 'https://www.linkedin.com/jobs/search/' }]; },
      async sendMessage(id, message) { messages.push(message); } }
  } });
  vm.runInContext(popup, context);
  return { context, saved, elements, messages };
}

test('popup defaults to hiding Applied, saves false, restores false on reopen', async () => {
  const f = setup();
  await f.context.loadSettings();
  const input = f.elements.get('#hideAppliedJobs');
  assert.equal(input.checked, true);
  input.checked = false;
  await input.change();
  assert.equal(f.saved.hideAppliedJobs, false);
  assert.equal(f.messages[0].settings.hideAppliedJobs, false);
  const reopened = setup(f.saved);
  await reopened.context.loadSettings();
  assert.equal(reopened.elements.get('#hideAppliedJobs').checked, false);
});

test('failed preference save restores the checkbox', async () => {
  const f = setup({}, true);
  await f.context.loadSettings();
  const input = f.elements.get('#hideAppliedJobs');
  input.checked = false;
  await input.change();
  assert.equal(input.checked, true);
  assert.equal(input.disabled, false);
  assert.equal(f.messages.length, 0);
});

test('malformed stored preferences use defaults instead of coercing strings', async () => {
  const f = setup({ autoDismissAppliedModal: 'false', hideAppliedJobs: null });
  await f.context.loadSettings();
  assert.equal(f.elements.get('#autoDismissAppliedModal').checked, false);
  assert.equal(f.elements.get('#hideAppliedJobs').checked, true);
});

test('content reload and storage events retain independent preferences', async () => {
  let listener;
  const context = vm.createContext({
    HIDE_APPLIED_JOBS_KEY: 'hideAppliedJobs', AUTO_DISMISS_APPLIED_MODAL_KEY: 'autoDismissAppliedModal',
    autoDismissAppliedModal: true, hideAppliedJobs: true,
    scheduleDismissAppliedModal() {}, startRetryWindow() {},
    chrome: { storage: { sync: { async get(defaults) { return { ...defaults, hideAppliedJobs: false, autoDismissAppliedModal: true }; } },
      onChanged: { addListener(fn) { listener = fn; } } } }
  });
  vm.runInContext(section(content, 'getStorageArea', 'window.addEventListener'), context);
  await context.loadSettings();
  assert.equal(context.hideAppliedJobs, false);
  assert.equal(context.autoDismissAppliedModal, true);
  context.watchSettings();
  listener({ hideAppliedJobs: { newValue: true } }, 'local');
  assert.equal(context.hideAppliedJobs, false);
  listener({ hideAppliedJobs: { newValue: true } }, 'sync');
  assert.equal(context.hideAppliedJobs, true);
  assert.equal(context.autoDismissAppliedModal, true);
  context.applySettings({ autoDismissAppliedModal: false });
  assert.equal(context.hideAppliedJobs, true);
  assert.equal(context.autoDismissAppliedModal, false);
  listener({ hideAppliedJobs: { newValue: false } }, 'sync');
  listener({ hideAppliedJobs: {} }, 'sync');
  assert.equal(context.hideAppliedJobs, true);
});
