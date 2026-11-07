const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const { readScript } = require('./built-script.cjs');

function setup(sendMessage = async () => ({ ok: true })) {
  const listeners = [];
  let deliveries = 0;
  let injections = 0;
  const context = vm.createContext({ chrome: {
    runtime: { onMessage: { addListener: listener => listeners.push(listener) }, sendMessage },
    tabs: { query: async () => [{ id: 7, windowId: 1 }], update: async () => {},
      sendMessage: async (...args) => { deliveries++; return sendMessage(...args); } },
    windows: { update: async () => {} },
    scripting: { executeScript: async () => { injections++; } }
  } });
  vm.runInContext(readScript('background.js'), context);
  return { context, deliveries: () => deliveries, injections: () => injections,
    async receive(message, sender = { tab: { url: 'https://www.linkedin.com/jobs/' } }) {
      let response;
      for (const listener of listeners) listener(message, sender, value => { response = value; });
      // Listener completion is asynchronous for supported transfers.
      await new Promise(resolve => setImmediate(resolve));
      return response;
    }
  };
}

test('malformed settings messages cannot be acknowledged as successfully applied', () => {
  const { context } = setup();
  // Use the actual registered messaging boundary, including its request codec.
  const callbacks = [];
  context.chrome.runtime.onMessage.addListener = fn => callbacks.push(fn);
  vm.runInContext('listen(settingsUpdated, () => { throw Error("Unexpected handler"); });', context);
  for (const settings of [null, [], { hideAppliedJobs: 'false' }, { unrelated: true }]) {
    let reply;
    callbacks[0]({ type: 'LJTC_SETTINGS_UPDATED', settings }, {}, value => { reply = value; });
    assert.equal(reply.ok, false);
  }
});

test('unknown or malformed messages never reach transfer side effects', async () => {
  const fixture = setup();
  for (const message of [null, [], 42, {}, { type: 'OTHER' },
    { type: 'LJTC_SEND_TO_CHATGPT', text: 12 }, { type: 'LJTC_SEND_TO_SHEETS' }]) {
    await fixture.receive(message);
  }
  assert.equal(fixture.deliveries(), 0);
  assert.equal(fixture.injections(), 0);
});

test('transfer requests from unsupported sites are rejected', async () => {
  const fixture = setup();
  for (const type of ['LJTC_SEND_TO_CHATGPT', 'LJTC_SEND_TO_SHEETS']) {
    const reply = await fixture.receive({ type, text: 'Job' }, { tab: { url: 'https://example.com/' } });
    assert.equal(reply.code, 'INVALID_SENDER');
  }
  assert.equal(fixture.deliveries(), 0);
});

test('malformed transfer replies remain uncertain and never cause another delivery', async () => {
  for (const reply of [undefined, null, [], { ok: 'true' }, { ok: false, code: 'UNKNOWN' }]) {
    const fixture = setup(async () => reply);
    assert.equal((await fixture.context.sendJobToChatGpt('Job')).code, 'CHATGPT_CONNECTION_FAILED');
    assert.equal((await fixture.context.sendJobToSheets('Job')).code, 'SHEETS_CONNECTION_FAILED');
    assert.equal(fixture.deliveries(), 2);
    assert.equal(fixture.injections(), 0);
  }
});

test('Sheets requires a complete receipt before reporting a successful write', async () => {
  const fixture = setup(async () => ({ ok: true }));
  assert.equal((await fixture.context.sendJobToSheets('Job')).code, 'SHEETS_CONNECTION_FAILED');
  assert.equal(fixture.deliveries(), 1);
});

test('partial and uncertain replies preserve their distinct results without recovery', async () => {
  for (const code of ['SHEETS_NEXT_CELL_FAILED', 'SHEETS_VERIFY_FAILED']) {
    const fixture = setup(async () => ({ ok: false, code, cell: 'B3', nextCell: 'B4' }));
    const reply = await fixture.context.sendJobToSheets('Job');
    assert.equal(reply.code, code);
    assert.equal(reply.cell, 'B3');
    assert.equal(fixture.deliveries(), 1);
    assert.equal(fixture.injections(), 0);
  }
  const fixture = setup(async () => ({ ok: false, code: 'SEND_BUTTON_NOT_READY' }));
  assert.equal((await fixture.context.sendJobToChatGpt('Job')).code, 'SEND_BUTTON_NOT_READY');
});
