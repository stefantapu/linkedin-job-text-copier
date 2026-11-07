const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'extension');
fs.mkdirSync(output, { recursive: true });
esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: ['background', 'content', 'popup', 'chatgpt', 'sheets'].map(name => `src/${name}.ts`),
  outdir: output,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  treeShaking: false,
  legalComments: 'none'
});
for (const name of ['manifest.json', 'popup.html', 'popup.css', 'styles.css', 'icons']) {
  fs.cpSync(path.join(root, name), path.join(output, name), { recursive: true });
}
console.log(`Unpacked extension: ${output}`);
