const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');

function loadRelay({ sendMessage, executeScript = async () => {}, tabs = [{ id: 7 }] }) {
  const context = vm.createContext({
    chrome: {
      tabs: { query: async () => tabs, sendMessage },
      scripting: { executeScript },
      runtime: { onMessage: { addListener() {} } }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), context);
  return (text) => context.sendJobToChatGpt(text);
}

test('an open ChatGPT tab with no receiver recovers before sending the job once', async () => {
  let ready = false;
  let submissions = 0;
  const relay = loadRelay({
    sendMessage: async (id, message) => {
      if (!ready) throw new Error('Could not establish connection. Receiving end does not exist.');
      if (message.type === 'LJTC_FILL_CHATGPT') submissions += 1;
      return { ok: true };
    },
    executeScript: async ({ target, files }) => {
      assert.equal(target.tabId, 7);
      assert.deepEqual(Array.from(files), ['chatgpt.js']);
      ready = true;
    }
  });
  const result = await relay('Job description');
  assert.equal(result.ok, true, `Open tab returned ${result.code}, which displays Reload ChatGPT`);
  assert.equal(submissions, 1);
});

function loadSendButton(response) {
  const source = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
  const start = source.indexOf('  async function sendToChatGpt(');
  const end = source.indexOf('  function fallbackCopy(', start);
  const context = vm.createContext({
    SEND_TO_CHATGPT_MESSAGE: 'LJTC_SEND_TO_CHATGPT',
    chrome: { runtime: { sendMessage: async () => response } },
    setButtonState: (button, label) => { button.textContent = label; }
  });
  vm.runInContext(source.slice(start, end), context);
  return context.sendToChatGpt;
}

test('a missing submit button does not incorrectly tell the user to reload ChatGPT', async () => {
  const button = { removeAttribute() {} };
  await loadSendButton({ ok: false, code: 'SEND_BUTTON_NOT_READY' })(button, () => 'Job');
  assert.notEqual(button.textContent, 'Reload ChatGPT');
  assert.equal(button.textContent, 'Check ChatGPT');
  assert.equal(button.disabled, false);
  assert.match(button.title, /text was inserted/i);
});

test('a lost response never triggers a second submission', async () => {
  let attempts = 0;
  let injections = 0;
  const relay = loadRelay({
    sendMessage: async () => {
      attempts += 1;
      throw new Error('The message port closed before a response was received.');
    },
    executeScript: async () => { injections += 1; }
  });
  assert.equal((await relay('Job')).code, 'CHATGPT_CONNECTION_FAILED');
  assert.equal(attempts, 1);
  assert.equal(injections, 0);
});

test('blocked recovery reports site access instead of a misleading reload', async () => {
  const relay = loadRelay({
    sendMessage: async () => { throw new Error('Receiving end does not exist.'); },
    executeScript: async () => { throw new Error('Cannot access contents of url.'); }
  });
  const response = await relay('Job');
  assert.equal(response.code, 'CHATGPT_SCRIPT_UNAVAILABLE');
  const button = { removeAttribute() {} };
  await loadSendButton(response)(button, () => 'Job');
  assert.equal(button.textContent, 'Check site access');
});

test('the most recently used ChatGPT tab is selected and its draft is preserved', async () => {
  const relay = loadRelay({
    tabs: [{ id: 1, lastAccessed: 10 }, { id: 2, lastAccessed: 20, url: 'https://chatgpt.com/g/g-p-example/c/example' }],
    sendMessage: async (id, message, options) => {
      assert.equal(id, 2);
      assert.equal(options.frameId, 0);
      assert.equal(message.text, 'Job');
      return { ok: false, code: 'DRAFT_EXISTS' };
    },
    executeScript: async () => assert.fail('An existing receiver must not be reinjected')
  });
  const response = await relay('Job');
  assert.equal(response.code, 'DRAFT_EXISTS');
  assert.equal(response.tabUrl, 'https://chatgpt.com/g/g-p-example/c/example');
});

test('no open ChatGPT tab requests opening a chat', async () => {
  const relay = loadRelay({
    tabs: [],
    sendMessage: async () => assert.fail('No tab to send to')
  });
  assert.equal((await relay('Job')).code, 'CHATGPT_NOT_OPEN');
});

function createChatGptPage(draft = '', { composerDelay = 0, missingComposer = false } = {}) {
  const listeners = [];
  let clicks = 0;
  let composerLookups = 0;
  let elapsed = 0;
  class Textarea {
    constructor() { this.text = draft; }
    get value() { return this.text; }
    set value(text) { this.text = text; }
    focus() {}
    dispatchEvent() {}
    getAttribute() { return null; }
    getClientRects() { return [{}]; }
    closest() { return null; }
  }
  const composer = new Textarea();
  const context = vm.createContext({
    HTMLTextAreaElement: Textarea,
    InputEvent: class {},
    Date: class extends Date { static now() { return elapsed; } },
    window: { setTimeout: (callback, delay) => {
      elapsed += delay;
      queueMicrotask(callback);
    } },
    document: {
      querySelectorAll: (selector) => {
        if (!selector.includes('#prompt-textarea')) return selector.startsWith('button') ? [{
          disabled: false,
          getAttribute: () => null,
          getClientRects: () => [{}],
          click: () => { clicks += 1; }
        }] : [];
        composerLookups += 1;
        return missingComposer || composerLookups <= composerDelay ? [] : [composer];
      }
    },
    chrome: { runtime: { onMessage: { addListener: (listener) => listeners.push(listener) } } }
  });
  const source = fs.readFileSync(path.join(root, 'chatgpt.js'), 'utf8');
  return {
    composer,
    inject: () => vm.runInContext(source, context),
    get listenerCount() { return listeners.length; },
    get clicks() { return clicks; },
    send: (message) => {
      if (!listeners.length) return Promise.reject(new Error('Receiving end does not exist.'));
      return new Promise((resolve) => listeners[0](message, {}, resolve));
    }
  };
}

test('waits for the ChatGPT message field to mount before inserting text', async () => {
  const page = createChatGptPage('', { composerDelay: 2 });
  page.inject();
  const response = await page.send({ type: 'LJTC_FILL_CHATGPT', text: 'Job' });
  assert.equal(response.ok, true, `Page loading returned ${response.code}, which displays Open a chat`);
  assert.equal(page.composer.value, 'Job');
  assert.equal(page.clicks, 1);
});

test('a page without a message field returns an error after a bounded wait', async () => {
  const page = createChatGptPage('', { missingComposer: true });
  page.inject();
  const response = await page.send({ type: 'LJTC_FILL_CHATGPT', text: 'Job' });
  assert.equal(response.code, 'COMPOSER_NOT_FOUND');
  assert.equal(page.composer.value, '');
  assert.equal(page.clicks, 0);
});

test('recovery runs the actual content script, inserts the job and submits once', async () => {
  const page = createChatGptPage();
  const relay = loadRelay({
    sendMessage: (id, message) => page.send(message),
    executeScript: async () => page.inject()
  });
  const response = await relay('Job description');
  assert.equal(response.ok, true);
  assert.equal(page.composer.value, 'Job description');
  assert.equal(page.clicks, 1);
});

test('manifest injection and recovery injection register just one content listener', async () => {
  const page = createChatGptPage();
  page.inject();
  page.inject();
  assert.equal(page.listenerCount, 1);
  assert.equal((await page.send({ type: 'LJTC_FILL_CHATGPT', text: 'Job' })).ok, true);
  assert.equal(page.clicks, 1);
});

test('the actual content script leaves an existing draft untouched', async () => {
  const page = createChatGptPage('My draft');
  page.inject();
  assert.equal((await page.send({ type: 'LJTC_FILL_CHATGPT', text: 'Job' })).code, 'DRAFT_EXISTS');
  assert.equal(page.composer.value, 'My draft');
  assert.equal(page.clicks, 0);
});

test('a missing message field has its own actionable error', async () => {
  const button = { removeAttribute() {} };
  const tabUrl = 'https://chatgpt.com/g/g-p-example/c/example';
  await loadSendButton({ ok: false, code: 'COMPOSER_NOT_FOUND', tabUrl })(button, () => 'Job');
  assert.equal(button.textContent, 'Chat field not found');
  assert.match(button.title, /message field was found/);
  assert.ok(button.title.includes(`Target tab: ${tabUrl}`));
});

test('recovery has the scripting permission and keeps host access limited to ChatGPT', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.ok(manifest.permissions.includes('scripting'));
  assert.deepEqual(manifest.host_permissions, ['https://chatgpt.com/*', 'https://chat.openai.com/*']);
});
