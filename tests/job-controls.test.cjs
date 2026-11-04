const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');

function card(id, labels = [], options = {}) {
  const node = {
    visible: true, removed: false, clicks: 0,
    getAttribute(name) { return name === 'componentkey' ? `job-card-component-ref-${id}` : name === 'role' ? 'button' : null; },
    querySelectorAll() { return labels.map(textContent => ({ textContent })); },
    remove() { this.removed = true; },
    scrollIntoView() {}, click() { this.clicks++; }, ...options
  };
  return node;
}
function load(nodes, current = '2', actions = []) {
  const context = vm.createContext({
    document: { querySelectorAll: () => nodes.filter(n => !n.removed) },
    getCurrentJobId: () => current,
    normalizeText: text => text.trim(), isVisible: node => node.visible,
    getJobSurface: () => ({ querySelectorAll: () => actions })
  });
  vm.runInContext(source.slice(source.indexOf('  // Keep the removed selection'),
    source.indexOf('  function hasMetadataSeparator(')), context);
  return { context, select(id) { current = id; } };
}

test('removes Applied DOM cards, deduplicates nested IDs, preserves other statuses', () => {
  const nodes = [card('1', ['Easy Apply']), card('2', ['Applied']), card('2', ['Applied']), card('3', ['Viewed']), card('4', ['Applied Materials engineer'])];
  const { context: c } = load(nodes);
  c.removeAppliedJobCards();
  assert.equal(nodes[1].removed, true);
  assert.equal(nodes[0].removed, false);
  assert.equal(nodes[3].removed, false);
  assert.equal(nodes[4].removed, false);
});

test('navigation keeps DOM order, skips applied and hidden cards, respects boundaries', () => {
  const nodes = [card('1'), card('2'), card('3', ['Applied']), card('4', [], { visible: false }), card('5')];
  const { context: c, select } = load(nodes);
  c.navigateJob(1);
  assert.equal(nodes[4].clicks, 1);
  assert.equal(nodes[2].removed, true);
  assert.equal(c.getAdjacentJob(-1).id, '1');
  select('1'); assert.equal(c.getAdjacentJob(-1), null);
  select('5'); assert.equal(c.getAdjacentJob(1), null);
  select('999'); assert.equal(c.getAdjacentJob(1), null);
});

test('removing selected Applied card retains both navigation directions', () => {
  const nodes = [card('1'), card('2', ['Applied']), card('3', ['Applied']), card('4')];
  const { context: c, select } = load(nodes);
  c.removeAppliedJobCards();
  c.removeAppliedJobCards(); // Mutation observer's next pass must retain position.
  assert.equal(c.getAdjacentJob(-1).id, '1');
  assert.equal(c.getAdjacentJob(1).id, '4');
  const reinserted = card('2', ['Applied']);
  nodes.push(reinserted);
  c.removeAppliedJobCards();
  assert.equal(reinserted.removed, true);
  assert.equal(c.getAdjacentJob(-1).id, '1');
  assert.equal(c.getAdjacentJob(1).id, '4');
  select('4'); c.removeAppliedJobCards();
  assert.equal(c.getAdjacentJob(-1).id, '1');
});

function action(label, options = {}) {
  return { textContent: label, dataset: {}, visible: true,
    getAttribute: name => name === 'aria-label' ? label : null,
    closest: () => null, ...options };
}
test('Apply resolves only available native actions and ignores injected controls', () => {
  for (const label of ['Apply on company website', 'Easy Apply', 'Apply to Engineer at Company']) {
    const native = action(label);
    const { context: c } = load([], '2', [action('Apply', { dataset: { ljtcAction: 'apply' } }), action('Apply', { disabled: true }), action('Apply', { visible: false }), action('Apply', { closest: () => ({}) }), native]);
    assert.equal(c.getNativeApplyButton(), native);
  }
  assert.equal(load([], '2', [action('Applied'), action('Save the job')]).context.getNativeApplyButton(), null);
});

test('control updates do not repeat observed disabled mutations', () => {
  let writes = 0;
  const values = new Map();
  const buttons = new Map(['ljtc-previous-job', 'ljtc-next-job', 'ljtc-apply-job'].map(id => [id, {
    textContent: 'Apply', get disabled() { return values.get(id) || false; },
    set disabled(value) { writes++; values.set(id, value); }
  }]));
  const wrapper = { querySelector: selector => buttons.get(selector.match(/="([^"]+)"/)[1]) };
  const { context: c } = load([]);
  c.updateJobControls(wrapper);
  assert.equal(writes, 3);
  c.updateJobControls(wrapper);
  assert.equal(writes, 3);
});
