const { test } = require('node:test');
const { extension } = require('./built-script.cjs');
const { checkArtifact } = require('../scripts/check-artifact.cjs');

test('unpacked artifact resolves manifest, popup and recovery scripts as classic JS', () => {
  checkArtifact(extension);
});
