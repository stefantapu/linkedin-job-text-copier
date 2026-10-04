const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname === '/chatgpt.js') {
    let source = fs.readFileSync(path.join(__dirname, '..', 'chatgpt.js'), 'utf8');
    if (url.searchParams.has('baseline')) {
      // Reproduce the old immediate, ID-only composer lookup against the same DOM.
      source = source.replace('await waitForComposer()', 'document.querySelector(COMPOSER_SELECTOR)');
    }
    response.setHeader('Content-Type', 'text/javascript');
    response.end(source);
    return;
  }
  if (url.pathname === '/') {
    response.setHeader('Content-Type', 'text/html');
    response.end(fs.readFileSync(path.join(__dirname, 'composer-browser.html')));
    return;
  }
  response.writeHead(404).end();
});
server.listen(8765, '127.0.0.1', () => process.stdout.write('Composer fixture: http://127.0.0.1:8765/\n'));
