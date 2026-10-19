(() => {
  if (globalThis.__ljtcSheetsInstalled) return;
  globalThis.__ljtcSheetsInstalled = true;
  let busy = false;

  const pause = (delay = 50) => new Promise((resolve) => setTimeout(resolve, delay));
  async function waitFor(check, timeout = 2000) {
    const deadline = Date.now() + timeout;
    do {
      if (check()) return true;
      await pause();
    } while (Date.now() < deadline);
    return false;
  }

  function getNameBox() {
    const box = document.querySelector('#t-name-box input, input#t-name-box');
    return box && !box.disabled ? box : null;
  }

  function getFormulaEditor() {
    return document.querySelector(
      '#t-formula-bar-input[contenteditable="true"], #t-formula-bar-input [contenteditable="true"]'
    );
  }

  function buildCellClipboard(text) {
    // Quoted TSV preserves embedded line breaks without carrying HTML styles.
    return `"${text.replace(/"/g, '""')}"`;
  }

  function pressKey(element, key, keyCode) {
    for (const type of ["keydown", "keyup"]) {
      element.dispatchEvent(new KeyboardEvent(type, {
        key, code: key, keyCode, which: keyCode,
        bubbles: true, cancelable: true
      }));
    }
  }

  async function fillCell(text) {
    if (busy) return { ok: false, code: "SHEETS_BUSY" };
    busy = true;
    let writeStarted = false;
    try {
      if (!await waitFor(() => document.hasFocus())) {
        return { ok: false, code: "SHEETS_NOT_READY" };
      }
      const box = getNameBox();
      const editor = getFormulaEditor();
      if (!box || !editor || editor.getBoundingClientRect().height === 0) {
        return { ok: false, code: "SHEETS_NOT_READY" };
      }
      const cell = box.value.trim().toUpperCase();
      const match = cell.match(/^([A-Z]+)([1-9]\d*)$/);
      if (!match) return { ok: false, code: "SHEETS_SELECTION_REQUIRED" };
      const nextCell = `${match[1]}${Number(match[2]) + 1}`;
      const active = document.activeElement;
      const inlineEditor = document.querySelector('.waffle-cell-editor .cell-input');
      if (editor.contains(active) || active === box || inlineEditor?.contains(active)) {
        return { ok: false, code: "SHEETS_EDITING" };
      }

      // A quoted plain-text field pastes as one cell while preserving its fill.
      await navigator.clipboard.writeText(buildCellClipboard(text));
      if (getNameBox()?.value.trim().toUpperCase() !== cell) {
        return { ok: false, code: "SHEETS_SELECTION_REQUIRED" };
      }

      // Paste into the grid's existing input target, without entering edit mode
      // or changing its selection. The quoted clipboard field is a 1x1 range.
      const gridDocument = document.querySelector('.docs-texteventtarget-iframe')?.contentDocument || document;
      writeStarted = true;
      if (!gridDocument.execCommand("paste")) {
        return { ok: false, code: "SHEETS_PASTE_FAILED" };
      }
      // Sheets does not always mirror a grid paste in the formula-bar DOM.
      // That editor echo must not block navigation after native paste succeeds.
      await pause(200);
      if (getNameBox()?.value.trim().toUpperCase() !== cell) {
        return { ok: false, code: "SHEETS_VERIFY_FAILED", stage: "check selection after paste", cell };
      }
      // Let the paste finish, then move the actual grid selection. Editing the
      // name-box input can change its displayed value without moving the grid.
      await pause(150);
      pressKey(gridDocument.activeElement || gridDocument.body, "ArrowDown", 40);
      const selectedCell = () => getNameBox()?.value.trim().toUpperCase();
      let moved = await waitFor(() => selectedCell() === nextCell);
      if (!moved && selectedCell() === cell && gridDocument !== document) {
        // DOM keyboard events inside an iframe do not bubble to the parent
        // document. Some Sheets versions handle grid navigation in the parent.
        pressKey(document.body, "ArrowDown", 40);
        moved = await waitFor(() => selectedCell() === nextCell);
      }
      if (!moved) {
        return { ok: false, code: "SHEETS_NEXT_CELL_FAILED", cell, nextCell, selectedCell: selectedCell() };
      }
      // Restore the ordinary Copy & confirm text for subsequent manual pastes.
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        // Native paste and navigation completed even if clipboard restoration failed.
      }
      return { ok: true, cell, nextCell };
    } catch (error) {
      return { ok: false, code: writeStarted ? "SHEETS_VERIFY_FAILED" : "SHEETS_NOT_READY" };
    } finally {
      busy = false;
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "LJTC_FILL_SHEETS") return false;
    if (sender.id !== chrome.runtime.id) return false;
    const text = typeof message.text === "string" ? message.text : "";
    if (!text.trim()) {
      sendResponse({ ok: false, code: "NO_TEXT" });
      return false;
    }
    fillCell(text).then(sendResponse);
    return true;
  });
})();
