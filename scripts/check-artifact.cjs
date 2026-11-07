const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const acorn = require('acorn');

function checkArtifact(extension) {
  const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
  const referenced = [manifest.background.service_worker, manifest.action.default_popup,
    ...Object.values(manifest.icons),
    ...manifest.content_scripts.flatMap(script => [...(script.js || []), ...(script.css || [])])];
  const popup = fs.readFileSync(path.join(extension, manifest.action.default_popup), 'utf8');
  for (const match of popup.matchAll(/(?:src|href)="([^"]+)"/g)) referenced.push(match[1]);
  const background = fs.readFileSync(path.join(extension, manifest.background.service_worker), 'utf8');
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Property' && node.key.name === 'files') {
      assert.equal(node.value.type, 'ArrayExpression');
      for (const file of node.value.elements) {
        assert.equal(typeof file.value, 'string');
        referenced.push(file.value);
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(acorn.parse(background, { ecmaVersion: 'latest' }));
  for (const name of referenced) assert.ok(fs.existsSync(path.join(extension, name)), `Missing ${name}`);
  for (const name of fs.readdirSync(extension).filter(name => name.endsWith('.js'))) {
    // Classic scripts must parse without module imports, including recovery files.
    new vm.Script(fs.readFileSync(path.join(extension, name), 'utf8'), { filename: name });
  }
  assert.ok(!fs.readdirSync(extension).some(name => /\.(?:ts|map)$/.test(name)));
}
module.exports = { checkArtifact };
