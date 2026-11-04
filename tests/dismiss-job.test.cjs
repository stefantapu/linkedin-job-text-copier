const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function element(tag, attrs = {}, children = []) {
  const node = {
    tag, attrs, children, dataset: {}, disabled: false, visible: true,
    getAttribute(name) { return this.attrs[name] ?? null; },
    classList: { contains: () => false },
    querySelectorAll(selector) {
      const descendants = this.children.flatMap((child) => [child, ...child.querySelectorAll('*')]);
      if (selector === '*') return descendants;
      if (selector === 'button') return descendants.filter((child) => child.tag === 'button');
      if (selector === 'a[href*="/jobs/view/"]') {
        return descendants.filter((child) => child.tag === 'a' && child.attrs.href?.includes('/jobs/view/'));
      }
      return descendants.filter((child) => selector.split(',').some((part) => {
        const match = part.trim().match(/^\[([^=\]^]+)(?:(\^?=)"([^"]*)")?\]$/);
        if (!match) throw new Error(`Unsupported selector: ${part}`);
        const value = child.attrs[match[1]];
        return value != null && (!match[2] || (match[2] === '^='
          ? value.startsWith(match[3]) : value === match[3]));
      }));
    }
  };
  children.forEach((child) => { child.parentElement = node; });
  return node;
}

const link = (id) => element('a', { href: `/jobs/view/${id}/` });
const cross = () => element('button', { 'aria-label': 'Dismiss Frontend Engineer job' });
const componentCard = (id, children) => element('div', {
  role: 'button', componentkey: `job-card-component-ref-${id}`
}, [element('div', { componentkey: `job-card-component-ref-${id}` }, children)]);

function resolve(cards, search = '?currentJobId=123', pathname = '/jobs/search/') {
  const body = element('body', {}, cards);
  const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
  const context = vm.createContext({
    URL, URLSearchParams,
    document: { body, querySelectorAll: body.querySelectorAll.bind(body) },
    location: { search, pathname, origin: 'https://www.linkedin.com' },
    isVisible: (node) => node.visible
  });
  vm.runInContext(source.slice(source.indexOf('  function getCurrentJobId('),
    source.indexOf('  function hasMetadataSeparator(')), context);
  return context.getCurrentJobDismissButton();
}

test('matches the selected job ID, even with identical titles and a details link', () => {
  const target = cross();
  assert.equal(resolve([
    element('div', {}, [link('456'), cross()]),
    element('div', {}, [link('123'), target]),
    element('div', {}, [link('123')])
  ]), target);
});

test('never borrows a cross from another job when the current cross is missing', () => {
  assert.equal(resolve([
    element('div', {}, [link('123')]),
    element('div', {}, [link('456'), cross()])
  ]), null);
});

test('refuses ambiguous, hidden, or disabled crosses', () => {
  assert.equal(resolve([element('div', {}, [link('123'), cross(), cross()])]), null);
  const hidden = cross();
  hidden.visible = false;
  const disabled = cross();
  disabled.disabled = true;
  assert.equal(resolve([element('div', {}, [link('123'), hidden, disabled])]), null);
});

test('supports classic cards and standalone job URLs', () => {
  const target = cross();
  assert.equal(resolve([element('li', { 'data-job-id': '123' }, [target])], '', '/jobs/view/123/'), target);
});

test('does not confuse a job ID prefix or missing current ID with the selected job', () => {
  assert.equal(resolve([element('div', {}, [link('1234'), cross()])]), null);
  assert.equal(resolve([element('div', {}, [link('123'), cross()])], ''), null);
});

test('finds the cross in componentkey cards without job links or data-job-id', () => {
  const target = cross();
  assert.equal(resolve([componentCard('456', [cross()]), componentCard('123', [target])]), target);
});

test('never borrows another component card cross or matches an ID prefix', () => {
  assert.equal(resolve([componentCard('123', []), componentCard('456', [cross()])]), null);
  assert.equal(resolve([componentCard('1234', [cross()])]), null);
});

test('resolves native undo only for the current job', () => {
  const undo = element('button', { 'aria-label': 'React Engineer job is dismissed, undo' });
  assert.equal(resolve([componentCard('123', [undo]), componentCard('456', [cross()])]), undo);
  assert.equal(resolve([componentCard('123', []), componentCard('456', [undo])]), null);
  undo.disabled = true;
  assert.equal(resolve([componentCard('123', [undo])]), null);
});

test('button follows native dismiss/undo state, delegates clicks and resets on job change', () => {
  const listeners = {};
  const classes = new Set();
  const button = {
    dataset: {}, textContent: '', title: '',
    classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); } },
    addEventListener(name, handler) { listeners[name] = handler; }
  };
  let dismissed = false;
  let clicks = 0;
  const native = {
    getAttribute: () => dismissed ? 'React Engineer job is dismissed, undo' : 'Dismiss React Engineer job',
    click() { dismissed = !dismissed; clicks++; }
  };
  let current = native;
  const context = vm.createContext({
    document: { createElement: () => button }, BUTTON_CLASS: 'ljtc-copy-button',
    DISMISS_ACTION_ID: 'dismiss', RUN_ID: 'test',
    getCurrentJobDismissButton: () => current,
    isUndoDismissButton: (node) => /job is dismissed, undo$/.test(node.getAttribute('aria-label')),
    setButtonState() { throw new Error('Unexpected missing native button'); }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
  vm.runInContext(source.slice(source.indexOf('  function updateDismissJobButton('),
    source.indexOf('  function removeLegacyHeaderButton(')), context);
  context.createDismissJobButton();
  assert.equal(button.textContent, 'Hide job');
  const click = () => listeners.click({ preventDefault() {}, stopPropagation() {} });
  click();
  assert.equal(button.textContent, 'Restore job');
  assert.equal(button.dataset.defaultLabel, 'Restore job');
  assert.ok(classes.has('ljtc-copy-button--undo-dismiss'));
  click();
  assert.equal(button.textContent, 'Hide job');
  assert.equal(clicks, 2);
  dismissed = true; // A native LinkedIn click also updates our button.
  context.updateDismissJobButton(button);
  assert.equal(button.textContent, 'Restore job');
  current = null; // Navigation must not retain the previous job's undo state.
  context.updateDismissJobButton(button);
  assert.equal(button.textContent, 'Hide job');
  assert.ok(!classes.has('ljtc-copy-button--undo-dismiss'));
});
