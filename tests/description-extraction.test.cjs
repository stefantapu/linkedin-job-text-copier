const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const selectors = source.match(/const JOB_DETAILS_SELECTOR = ([\s\S]*?\.join\(", "\));/)[1];
const extraction = source.slice(source.indexOf('  function getAboutJobText('),
  source.indexOf('  function confirmExternalApplication('));

function fixture({ legacy = false, missing = false, unrelated = false } = {}) {
  const body = { text: 'REVER is a Barcelona based startup.\n\nRequirements\nLearn quickly\n\nOffice in Barcelona' };
  const heading = { text: 'About the job' };
  const company = { text: 'About the company\nCompany marketing text' };
  const surface = {
    querySelector: (selector) => legacy && selector.includes('#job-details') ? body : null,
    querySelectorAll: () => missing ? [] : [heading]
  };
  const section = {
    parentElement: surface,
    querySelector: (selector) => selector === '[data-testid="expandable-text-box"]' ? body : null,
    querySelectorAll: () => [heading]
  };
  heading.parentElement = {
    parentElement: section, querySelector: () => null, querySelectorAll: () => [heading]
  };
  const context = vm.createContext({
    getJobSurface: () => surface,
    document: { querySelector: () => unrelated ? company : legacy ? body : null },
    getVisibleText: (node) => node?.text || '',
    getCompanyName: () => 'REVER AI (YC S22).',
    getJobTitle: () => 'Junior Software Engineer',
    getPrimaryJobMeta: () => 'Barcelona, Catalonia, Spain · 1 year ago · Over 100 people clicked apply',
    getJobUrl: () => 'https://www.linkedin.com/jobs/view/4299367799/'
  });
  vm.runInContext(`const JOB_DETAILS_SELECTOR = ${selectors};\n${extraction}`, context);
  return { context, body };
}

test('new LinkedIn layout with random componentkey includes the entire description', () => {
  const { context, body } = fixture();
  assert.equal(context.buildDescriptionClipboardText(),
    `${context.getTopClipboardParts().join('\n\n')}\n\n${body.text}`);
});

test('classic job-details descriptions still work', () => {
  const { context, body } = fixture({ legacy: true });
  assert.equal(context.getAboutJobText(), body.text);
});

test('a missing description never produces a header-only payload', () => {
  assert.equal(fixture({ missing: true }).context.buildDescriptionClipboardText(), '');
});

test('description lookup stays inside the selected job surface', () => {
  const { context, body } = fixture({ unrelated: true });
  assert.equal(context.getAboutJobText(), body.text);
});

test('both buttons use the full-description builder', () => {
  assert.match(source, /sendToChatGpt\(button, buildDescriptionClipboardText\)/);
  assert.match(source, /"Copy description",\s*DESCRIPTION_BUTTON_CLASS,\s*DESCRIPTION_ACTION_ID,\s*buildDescriptionClipboardText/);
});
