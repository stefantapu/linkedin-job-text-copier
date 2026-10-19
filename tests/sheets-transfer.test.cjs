const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const sheetsSource = fs.readFileSync(path.join(root, 'sheets.js'), 'utf8');
const payload = 'Example company\n\nFrontend Developer\n\nSpain · Remote\n\nhttps://www.linkedin.com/jobs/view/123/';

// Parse tabular clipboard text independently of production code. Newlines and
// tabs delimit grid cells only outside double-quoted fields.
function parseTsv(text) {
  const rows = [[]];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === '\t' || char === '\n')) {
      rows.at(-1).push(value);
      value = '';
      if (char === '\n') rows.push([]);
    } else value += char;
  }
  rows.at(-1).push(value);
  return rows;
}

function sheetPage({ cell = 'A960', paste = true, commit = true, missing = false, nextFails = false, nameBoxNavigation = true, formulaSuffix = '', iframeKeysIgnored = false, staleFormula = false } = {}) {
  let listener;
  let clipboard = '';
  let clipboardHtml = '';
  let pastedHtml = '';
  let pastedRows;
  let selected = cell;
  let clock = 0;
  let navigations = 0;
  let pastes = 0;
  let gridEnters = 0;
  const cells = new Map([[cell, 'Old value'], ['A961', 'Keep below'], ['B960', 'Keep beside']]);
  const backgrounds = new Map([[cell, 'yellow']]);
  class Input {
    get value() { return this.current; }
    set value(value) { this.current = value; }
    focus() { document.activeElement = this; }
    dispatchEvent(event) {
      if (event.type !== 'keydown') return;
      if (!nameBoxNavigation) return;
      navigations++;
      if (nextFails && navigations === 2) return;
      selected = this.value;
      editor.textContent = cells.get(selected) || '';
      document.activeElement = document.body;
    }
  }
  const box = new Input();
  box.value = cell;
  const editor = {
    textContent: cells.get(cell),
    getBoundingClientRect: () => ({ height: 20 }),
    contains: (element) => element === editor
  };
  const document = {
    body: { dispatchEvent(event) {
      if (event.key === 'Enter') gridEnters++;
      if (event.type !== 'keydown' || event.key !== 'ArrowDown' || nextFails) return;
      const address = selected.match(/^([A-Z]+)([0-9]+)$/);
      selected = address[1] + (Number(address[2]) + 1);
      box.value = selected;
      editor.textContent = cells.get(selected) || '';
    } }, activeElement: null, hasFocus: () => true,
    querySelector: (selector) => {
      if (missing) return null;
      if (selector.includes('t-name-box')) return box;
      if (selector.includes('t-formula-bar-input')) return editor;
      if (selector.includes('docs-texteventtarget-iframe') && iframeKeysIgnored) {
        return { contentDocument: { activeElement: { dispatchEvent() {} }, execCommand: document.execCommand } };
      }
      return null;
    },
    execCommand: (command) => {
      assert.equal(command, 'paste');
      pastes++;
      if (!paste) return false;
      pastedHtml = clipboardHtml;
      if (clipboardHtml) backgrounds.set(selected, 'white');
      pastedRows = parseTsv(clipboard);
      const start = selected.match(/^([A-Z]+)([0-9]+)$/);
      if (commit) {
        pastedRows.forEach((row, offset) => {
          row.forEach((value, column) => {
            // Fixtures start in A; preserve actual grid paste splitting behavior.
            const address = String.fromCharCode(65 + column) + (Number(start[2]) + offset);
            cells.set(address, value);
          });
        });
      }
      if (commit && !staleFormula) editor.textContent = pastedRows[0][0] + formulaSuffix;
      return true;
    }
  };
  document.activeElement = document.body;
  class Event { constructor(type, init) { this.type = type; Object.assign(this, init); } }
  class ClipboardItem { constructor(data) { this.data = data; } }
  const context = vm.createContext({
    document, HTMLInputElement: Input, Event, KeyboardEvent: Event, ClipboardItem, Blob,
    navigator: { clipboard: {
      write: async ([item]) => {
        clipboard = await item.data['text/plain'].text();
        clipboardHtml = await item.data['text/html'].text();
      },
      writeText: async (text) => { clipboard = text; clipboardHtml = ''; }
    } },
    Date: { now: () => clock }, setTimeout: (fn, delay) => { clock += delay; fn(); },
    chrome: { runtime: { id: 'extension', onMessage: { addListener: (fn) => { listener = fn; } } } }
  });
  vm.runInContext(sheetsSource, context);
  return {
    cells, backgrounds, document, box, editor,
    get clipboard() { return clipboard; },
    get pastedRows() { return pastedRows; },
    get pastedHtml() { return pastedHtml; },
    get gridEnters() { return gridEnters; },
    get selected() { return selected; },
    get pastes() { return pastes; },
    inject: () => vm.runInContext(sheetsSource, context),
    send: (text = payload) => new Promise((resolve) => {
      listener({ type: 'LJTC_FILL_SHEETS', text }, { id: 'extension' }, resolve);
    })
  };
}

test('raw multiline clipboard reproduces row splitting; To Sheets pastes exactly one grid cell', async () => {
  assert.equal(parseTsv(payload).length, 7);
  const page = sheetPage();
  const response = await page.send();
  assert.equal(response.ok, true);
  assert.deepEqual(page.pastedRows, [[payload]]);
  assert.equal(page.cells.get('A960'), payload);
  assert.equal(page.cells.get('A961'), 'Keep below');
  assert.equal(page.cells.get('B960'), 'Keep beside');
  assert.equal(page.selected, 'A961');
  assert.equal(page.clipboard, payload);
  assert.equal(page.gridEnters, 0);
  assert.equal(page.pastedHtml, '');
  assert.equal(page.backgrounds.get('A960'), 'yellow');
});

test('quotes, tabs, Unicode and HTML-looking text remain inside one cell', async () => {
  const page = sheetPage();
  const text = 'Company "Example" & <script>\n\nReact\tTypeScript\nEspaña';
  assert.equal((await page.send(text)).ok, true);
  assert.deepEqual(page.pastedRows, [[text]]);
  assert.equal(page.pastedHtml, '');
  assert.equal(page.cells.get('A961'), 'Keep below');
});

test('two sends advance one row each, keeping multiline payloads intact', async () => {
  const page = sheetPage();
  assert.equal((await page.send()).ok, true);
  assert.equal((await page.send('Second\n\njob')).ok, true);
  assert.equal(page.cells.get('A961'), 'Second\n\njob');
  assert.equal(page.selected, 'A962');
});

test('moving down uses the grid even when programmatic name-box navigation is unavailable', async () => {
  const page = sheetPage({ nameBoxNavigation: false });
  assert.equal((await page.send()).ok, true);
  assert.equal(page.selected, 'A961');
});

test('a different formula-editor representation does not block moving down after paste', async () => {
  const page = sheetPage({ formulaSuffix: '\n' });
  assert.equal((await page.send()).ok, true);
  assert.equal(page.selected, 'A961');
});

test('navigation reaches the parent grid when the text-event iframe ignores arrows', async () => {
  const page = sheetPage({ iframeKeysIgnored: true });
  assert.equal((await page.send()).ok, true);
  assert.equal(page.selected, 'A961');
});

test('ranges and named ranges are rejected before writing', async () => {
  for (const cell of ['A960:B961', 'A:A', 'MyRange']) {
    const page = sheetPage({ cell });
    assert.equal((await page.send()).code, 'SHEETS_SELECTION_REQUIRED');
    assert.equal(page.pastes, 0);
  }
});

test('an active formula editor is preserved', async () => {
  const page = sheetPage();
  page.document.activeElement = page.editor;
  assert.equal((await page.send()).code, 'SHEETS_EDITING');
  assert.equal(page.pastes, 0);
});

test('a failed native paste is not reported as saved', async () => {
  const page = sheetPage({ paste: false });
  assert.equal((await page.send()).code, 'SHEETS_PASTE_FAILED');
  assert.equal(page.cells.get('A960'), 'Old value');
});

test('a stale formula-bar DOM does not block navigation after native paste succeeds', async () => {
  const page = sheetPage({ staleFormula: true });
  assert.equal((await page.send()).ok, true);
  assert.equal(page.cells.get('A960'), payload);
  assert.equal(page.selected, 'A961');
});

test('a saved cell with failed next-row selection returns a distinct partial result', async () => {
  const page = sheetPage({ nextFails: true });
  assert.equal((await page.send()).code, 'SHEETS_NEXT_CELL_FAILED');
  assert.equal(page.cells.get('A960'), payload);
});

test('read-only or missing editor fails before paste', async () => {
  const page = sheetPage({ missing: true });
  assert.equal((await page.send()).code, 'SHEETS_NOT_READY');
  assert.equal(page.pastes, 0);
});

test('duplicate injection and overlapping sends do not duplicate writes', async () => {
  const page = sheetPage();
  page.inject();
  const first = page.send();
  assert.equal((await page.send()).code, 'SHEETS_BUSY');
  assert.equal((await first).ok, true);
  assert.equal(page.pastes, 1);
});

function relay({ tabs = [{ id: 9, windowId: 1 }], sendMessage = async () => ({ ok: true }), inject = async () => {} } = {}) {
  const activated = [];
  const context = vm.createContext({
    chrome: {
      tabs: { query: async () => tabs, update: async (id) => activated.push(id), sendMessage },
      windows: { update: async () => {} },
      scripting: { executeScript: inject },
      runtime: { onMessage: { addListener() {} } }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), context);
  return { activated, send: () => context.sendJobToSheets(payload, { id: 2, windowId: 1 }) };
}

test('relay uses the last used spreadsheet and returns to LinkedIn only after success', async () => {
  const fixture = relay({
    tabs: [{ id: 8, lastAccessed: 100 }, { id: 9, lastAccessed: 200 }],
    sendMessage: async (id, message, options) => {
      assert.equal(id, 9);
      assert.equal(message.text, payload);
      assert.equal(options.frameId, 0);
      return { ok: true };
    }
  });
  assert.equal((await fixture.send()).ok, true);
  assert.deepEqual(fixture.activated, [9, 2]);
});

test('no open Sheets tab gives an actionable error', async () => {
  assert.equal((await relay({ tabs: [] }).send()).code, 'SHEETS_NOT_OPEN');
});

test('missing Sheets receiver is injected once; an uncertain write is never retried', async () => {
  let attempts = 0;
  let injections = 0;
  const recover = relay({
    sendMessage: async () => {
      if (++attempts === 1) throw new Error('Receiving end does not exist');
      return { ok: true };
    }, inject: async () => { injections++; }
  });
  assert.equal((await recover.send()).ok, true);
  assert.equal(attempts, 2);
  assert.equal(injections, 1);

  attempts = 0;
  const uncertain = relay({ sendMessage: async () => {
    attempts++;
    throw new Error('The message port closed before a response was received');
  } });
  assert.equal((await uncertain.send()).code, 'SHEETS_CONNECTION_FAILED');
  assert.equal(attempts, 1);
  assert.deepEqual(uncertain.activated, [9]);
});

test('relay serializes simultaneous transfers', async () => {
  let finish;
  const fixture = relay({ sendMessage: () => new Promise((resolve) => { finish = resolve; }) });
  const first = fixture.send();
  assert.equal((await fixture.send()).code, 'SHEETS_BUSY');
  // Allow query, tab activation and window focus promises to settle.
  await new Promise((resolve) => setImmediate(resolve));
  finish({ ok: true });
  assert.equal((await first).ok, true);
});
