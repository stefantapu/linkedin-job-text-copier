const { readScript, section, initializer, extension } = require('./built-script.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = readScript('content.js');
const attributeSource = section(source, 'cloneElement', 'getVisibleText')
  + section(source, 'getJobAttributeMeta', 'getJobUrl');
const builders = section(source, 'getTopClipboardParts', 'confirmExternalApplication');

function fixture({ legacy = false, chips = ['45K EUR/yr - 60K EUR/yr', 'Hybrid', 'Full-time'], hidden = [], boundary = false } = {}) {
  const node = (text, index) => ({ text, visible: !hidden.includes(index), cloneNode() { return this; }, querySelectorAll() { return []; } });
  const header = { parentElement: null, querySelector: () => boundary ? {} : null, matches: () => false,
    querySelectorAll: () => chips.map(node) };
  const title = { parentElement: { parentElement: header, querySelector: () => null, matches: () => false, querySelectorAll: () => [] } };
  const surface = { contains: () => true, querySelectorAll: () => [node('999K USD/yr')] };
  header.parentElement = surface;
  const context = vm.createContext({
    JOB_DETAILS_SELECTOR: '#job-details', getJobSurface: () => surface,
    getTopCard: () => legacy ? header : null, getJobTitleLink: () => title,
    isVisible: el => el.visible, getVisibleText: el => el.text,
    getCompanyName: () => 'Novaliance', getJobTitle: () => 'Concepteur-développeur applicatif (H/F)',
    getPrimaryJobMeta: () => 'Malakoff, Île-de-France, France · 27 minutes ago · 2 applicants',
    getJobUrl: () => 'https://www.linkedin.com/jobs/view/4486228315/',
    getAboutJobText: () => 'Nous recherchons une personne…'
  });
  vm.runInContext(attributeSource + builders, context);
  return context;
}

for (const legacy of [false, true]) {
  test(`${legacy ? 'classic' : 'SDUI'} chips enter both summary and description payloads`, () => {
    const c = fixture({ legacy });
    const expected = '45K EUR/yr - 60K EUR/yr · Hybrid · Full-time';
    assert.equal(c.getJobAttributeMeta(), expected);
    assert.ok(c.buildTopClipboardText().includes(expected));
    assert.ok(c.buildDescriptionClipboardText().includes(expected));
    assert.ok(c.buildTopClipboardText().endsWith(c.getJobUrl()));
    assert.ok(!c.buildDescriptionClipboardText().includes(c.getJobUrl()));
  });
}

test('missing salary is omitted; remote, onsite and other employment types remain readable', () => {
  for (const workplace of ['Remote', 'On-site', 'Hybrid']) {
    for (const type of ['Part-time', 'Contract', 'Temporary', 'Internship', 'Volunteer', 'Other']) {
      assert.equal(fixture({ chips: [workplace, type] }).getJobAttributeMeta(), `${workplace} · ${type}`);
    }
  }
});

test('deduplicates chips and excludes hidden fields, action buttons and boilerplate', () => {
  const c = fixture({ chips: ['Hybrid', 'Hybrid', '✓ Full-time', '$50/hr', 'Save', 'Easy Apply', 'No response insights available yet', '999K EUR/yr'], hidden: [7] });
  assert.equal(c.getJobAttributeMeta(), 'Hybrid · Full-time · $50/hr');
});

test('does not collect attributes from description or other jobs beyond header boundary', () => {
  assert.equal(fixture({ boundary: true }).getJobAttributeMeta(), '');
  assert.equal(fixture({ chips: [] }).getJobAttributeMeta(), '');
});

test('all four actions share the two metadata-enriched text builders', () => {
  assert.match(source, /sendToChatGpt\(button, buildDescriptionClipboardText\)/);
  assert.match(source, /"Copy description",\s*DESCRIPTION_BUTTON_CLASS,\s*DESCRIPTION_ACTION_ID,\s*buildDescriptionClipboardText/);
  assert.match(source, /createCopyButton\("Copy & mark applied",[^\n]+buildTopClipboardText\)/);
  const sheets = section(source, 'sendToSheets', 'createSheetsButton');
  assert.match(sheets, /(?:const|var) text = buildTopClipboardText\(\)/);
});
