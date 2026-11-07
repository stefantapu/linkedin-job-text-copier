const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');

const extension = process.env.LJTC_EXTENSION_DIR || path.join(__dirname, '..', 'dist', 'extension');
const parse = source => acorn.parse(source, { ecmaVersion: 'latest' });
function readScript(name) {
  const source = fs.readFileSync(path.join(extension, name), 'utf8');
  const fn = parse(source).body.find(node => node.expression?.type === 'CallExpression')?.expression.callee;
  if (fn?.type !== 'ArrowFunctionExpression' || fn.body.type !== 'BlockStatement') throw Error('Expected bundled IIFE');
  return source.slice(fn.body.start + 1, fn.body.end - 1);
}
function groups(source) {
  const result = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Program' || node.type === 'BlockStatement') result.push(node.body);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(parse(source));
  return result;
}
function matches(node, name, source) {
  if (node.type === 'FunctionDeclaration') return node.id?.name === name;
  if (node.type === 'VariableDeclaration') return node.declarations.some(d => d.id.name === name);
  if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression') {
    const callee = node.expression.callee;
    return source.slice(callee.start, callee.end).replace(/\s/g, '') === name;
  }
  return false;
}
function shared(source) {
  const group = groups(source)[0];
  const end = group.findIndex(node => node.type === 'FunctionDeclaration' && node.id.name === 'listen');
  return end < 0 ? '' : source.slice(group[0].start, group[end].end) + '\n';
}
function section(source, first, until) {
  for (const group of groups(source)) {
    const start = group.findIndex(node => matches(node, first, source));
    if (start < 0) continue;
    const end = group.findIndex((node, index) => index > start && matches(node, until, source));
    if (end < 0) throw Error(`Missing end declaration: ${until}`);
    return shared(source) + source.slice(group[start].start, group[end].start) + '\n';
  }
  throw Error(`Missing declaration: ${first}`);
}
function initializer(source, name) {
  for (const group of groups(source)) for (const node of group) {
    if (node.type !== 'VariableDeclaration') continue;
    const declaration = node.declarations.find(d => d.id.name === name);
    if (declaration?.init) return source.slice(declaration.init.start, declaration.init.end);
  }
  throw Error(`Missing variable: ${name}`);
}
module.exports = { extension, readScript, section, initializer };
