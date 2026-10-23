const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const functions = source.slice(source.indexOf('  function getJobCards('),
  source.indexOf('  async function sendToSheets('));

function setup({ ids = ['1', '2', '3'], current = '1', nextDisabled = false, nextPresent = true } = {}) {
  const clicks = [];
  const reports = [];
  const timers = [];
  const listeners = new Map();
  const surface = {};
  const card = (id) => ({
    visible: true,
    getAttribute: (name) => name === 'componentkey' ? `job-card-component-ref-${id}` : null,
    click: () => clicks.push(id)
  });
  let cards = ids.map(card);
  const next = { visible: true, disabled: nextDisabled, getAttribute: () => null,
    click: () => clicks.push('Next') };
  const root = { querySelectorAll: (selector) => selector.startsWith('[role=') ? cards : [] };
  const context = vm.createContext({
    document: {
      querySelector: () => root,
      querySelectorAll: () => nextPresent ? [next] : [],
      addEventListener: (type, listener) => listeners.set(type, listener),
      removeEventListener: (type) => listeners.delete(type)
    },
    window: { setTimeout: (callback, ms) => timers.push({ callback, ms }) },
    getCurrentJobId: () => context.jobId,
    getJobSurface: () => context.surface,
    isVisible: (node) => node.visible,
    jobId: current, surface
  });
  vm.runInContext(functions, context);
  return {
    context, clicks, timers, listeners, reports,
    start: () => context.openNextJobAfterSheets(current, (message) => reports.push(message)),
    tick: async () => { assert.ok(timers.length); timers.shift().callback(); await Promise.resolve(); },
    replaceCards: (ids) => { cards = ids.map(card); },
    hide: (index) => { cards[index].visible = false; }
  };
}

test('opens next nonhidden card after 600ms, including already viewed jobs', async () => {
  const fixture = setup();
  fixture.hide(1);
  const pending = fixture.start();
  assert.deepEqual(fixture.clicks, []);
  assert.equal(fixture.timers[0].ms, 600);
  await fixture.tick();
  await pending;
  assert.deepEqual(fixture.clicks, ['3']);
  assert.equal(fixture.listeners.size, 0);
});

test('last card clicks Next, waits for new results, then opens first card', async () => {
  const fixture = setup({ current: '3' });
  const pending = fixture.start();
  await fixture.tick();
  assert.deepEqual(fixture.clicks, ['Next']);
  await fixture.tick();
  assert.deepEqual(fixture.clicks, ['Next']);
  fixture.replaceCards(['4', '5']);
  await fixture.tick();
  await pending;
  assert.deepEqual(fixture.clicks, ['Next', '4']);
  assert.equal(fixture.listeners.size, 0);
});

for (const options of [{ nextDisabled: true }, { nextPresent: false }]) {
  test(`stops at last page: ${JSON.stringify(options)}`, async () => {
    const fixture = setup({ current: '3', ...options });
    const pending = fixture.start();
    await fixture.tick();
    await pending;
    assert.deepEqual(fixture.clicks, []);
    assert.match(fixture.reports.at(-1), options.nextPresent === false ? /Next button not found/ : /Next button hidden or disabled/);
  });
}

test('opens first visible result when current job is absent from the list', async () => {
  const fixture = setup({ current: '9' });
  const pending = fixture.start();
  await fixture.tick();
  await pending;
  assert.deepEqual(fixture.clicks, ['1']);
});

test('after Easy Apply, uses hidden current card position from supplied HTML', async () => {
  const fixture = setup({
    ids: ['4482443858', '4480702937', '4481650540', '4476875564', '4482066670'],
    current: '4481650540'
  });
  fixture.hide(2);
  const pending = fixture.start();
  await fixture.tick();
  await pending;
  assert.deepEqual(fixture.clicks, ['4476875564']);
});

test('hidden current card at end advances page rather than reopening earlier results', async () => {
  const fixture = setup({ current: '3' });
  fixture.hide(2);
  const pending = fixture.start();
  await fixture.tick();
  assert.deepEqual(fixture.clicks, ['Next']);
  fixture.replaceCards(['4', '5']);
  await fixture.tick();
  await pending;
  assert.deepEqual(fixture.clicks, ['Next', '4']);
});

test('manual job change during success delay cancels navigation', async () => {
  const fixture = setup();
  const pending = fixture.start();
  fixture.context.jobId = '2';
  await fixture.tick();
  await pending;
  assert.deepEqual(fixture.clicks, []);
});

test('same job rerendered after confirmation still advances to Next', async () => {
  const fixture = setup({ current: '3' });
  const pending = fixture.start();
  fixture.context.surface = {};
  await fixture.tick();
  assert.deepEqual(fixture.clicks, ['Next']);
  fixture.replaceCards(['4', '5']);
  await fixture.tick();
  await pending;
  assert.deepEqual(fixture.clicks, ['Next', '4']);
});

test('confirmation rerender before navigation begins does not block Next', async () => {
  const fixture = setup({ current: '3' });
  fixture.context.surface = {};
  const pending = fixture.start();
  await fixture.tick();
  assert.deepEqual(fixture.clicks, ['Next']);
  fixture.replaceCards(['4', '5']);
  await fixture.tick();
  await pending;
  assert.deepEqual(fixture.clicks, ['Next', '4']);
});

test('manual action while loading next page cancels first-card click', async () => {
  const fixture = setup({ current: '3' });
  const pending = fixture.start();
  await fixture.tick();
  fixture.listeners.get('pointerdown')({ isTrusted: true });
  fixture.replaceCards(['4', '5']);
  await fixture.tick();
  await pending;
  assert.deepEqual(fixture.clicks, ['Next']);
  assert.equal(fixture.listeners.size, 0);
});

test('keeps LinkedIn automatic selection on next page', async () => {
  const fixture = setup({ current: '3' });
  const pending = fixture.start();
  await fixture.tick();
  fixture.context.jobId = '4';
  fixture.replaceCards(['4', '5']);
  await fixture.tick();
  await pending;
  assert.deepEqual(fixture.clicks, ['Next']);
});

test('times out if Next does not produce new results', async () => {
  const fixture = setup({ current: '3' });
  const pending = fixture.start();
  await fixture.tick();
  for (let attempt = 0; attempt < 54; attempt += 1) await fixture.tick();
  await pending;
  assert.deepEqual(fixture.clicks, ['Next']);
  assert.equal(fixture.listeners.size, 0);
  assert.match(fixture.reports.at(-1), /Next was clicked, but new results did not appear/);
});
