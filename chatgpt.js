(() => {
  // Both the manifest and recovery injection can load this file in the same tab.
  // Register a single listener so one click cannot submit twice.
  if (globalThis.__ljtcChatGptInstalled) {
    return;
  }
  const FILL_CHATGPT_MESSAGE = "LJTC_FILL_CHATGPT";
  const COMPOSER_SELECTOR = [
    "#prompt-textarea",
    'textarea[data-testid="prompt-textarea"]',
    'div[contenteditable="true"][data-testid="prompt-textarea"]'
  ].join(", ");
  const COMPOSER_FALLBACK_SELECTOR = [
    "main form textarea",
    'main form [contenteditable="true"][role="textbox"]',
    'main form .ProseMirror[contenteditable="true"]'
  ].join(", ");
  const SEND_BUTTON_SELECTOR = [
    'button[type="submit"][aria-label="Send"]',
    'button[data-composer-submit][type="submit"]',
    "button#composer-submit-button",
    'button[data-testid="send-button"]',
    'button[data-testid="composer-submit-button"]',
    'button[aria-label="Send prompt"]',
    'button[aria-label="Send message"]'
  ].join(", ");

  function isWritableComposer(element) {
    return (element instanceof HTMLTextAreaElement || element.isContentEditable)
      && !element.disabled
      && !element.readOnly
      && element.getAttribute("aria-disabled") !== "true"
      && element.getClientRects().length > 0;
  }

  function findComposer() {
    const preferred = Array.from(document.querySelectorAll(COMPOSER_SELECTOR))
      .filter(isWritableComposer);
    if (preferred.length === 1) {
      return preferred[0];
    }
    if (preferred.length > 1) {
      return null;
    }

    const candidates = Array.from(document.querySelectorAll(COMPOSER_FALLBACK_SELECTOR))
      .filter(isWritableComposer);
    // Never guess which field to overwrite if a page contains several editors.
    return candidates.length === 1 ? candidates[0] : null;
  }

  function waitForComposer(timeoutMs = 3000) {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      function check() {
        const composer = findComposer();
        if (composer || Date.now() >= deadline) {
          resolve(composer);
          return;
        }
        window.setTimeout(check, 50);
      }
      check();
    });
  }

  function getComposerText(composer) {
    if (composer instanceof HTMLTextAreaElement) {
      return composer.value.trim();
    }

    return (composer.innerText || composer.textContent || "").trim();
  }

  function fillTextarea(textarea, text) {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    )?.set;

    valueSetter?.call(textarea, text);
    textarea.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      data: text,
      inputType: "insertText"
    }));
  }

  function fillContentEditable(composer, text) {
    composer.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(composer);
    selection.removeAllRanges();
    selection.addRange(range);

    const inserted = document.execCommand("insertText", false, text);

    if (!inserted) {
      composer.textContent = text;
      composer.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        data: text,
        inputType: "insertText"
      }));
    }
  }

  function fillComposer(composer, text) {
    composer.focus();

    if (composer instanceof HTMLTextAreaElement) {
      fillTextarea(composer, text);
      return;
    }

    fillContentEditable(composer, text);
  }

  function waitForEnabledSendButton(composer, timeoutMs = 3000) {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      const scope = composer.closest("form") || document;

      function check() {
        const button = Array.from(scope.querySelectorAll(SEND_BUTTON_SELECTOR)).find((candidate) =>
          !candidate.disabled
          && candidate.getAttribute("aria-disabled") !== "true"
          && candidate.getAttribute("data-testid") !== "stop-button"
          && (!candidate.getAttribute("data-stop-label")
            || candidate.getAttribute("aria-label") !== candidate.getAttribute("data-stop-label"))
          && (!candidate.getAttribute("data-send-label")
            || candidate.getAttribute("aria-label") === candidate.getAttribute("data-send-label"))
          && candidate.getClientRects().length > 0
        );

        if (button) {
          resolve(button);
          return;
        }

        if (Date.now() >= deadline) {
          resolve(null);
          return;
        }

        window.setTimeout(check, 50);
      }

      check();
    });
  }

  async function fillAndSubmit(text) {
    const composer = await waitForComposer();

    if (!composer) {
      return {
        ok: false,
        code: "COMPOSER_NOT_FOUND"
      };
    }

    if (getComposerText(composer)) {
      return {
        ok: false,
        code: "DRAFT_EXISTS"
      };
    }

    fillComposer(composer, text);

    const sendButton = await waitForEnabledSendButton(composer);
    if (!sendButton) {
      return {
        ok: false,
        code: "SEND_BUTTON_NOT_READY"
      };
    }

    sendButton.click();
    return {
      ok: true
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== FILL_CHATGPT_MESSAGE) {
      return false;
    }

    const text = typeof message.text === "string" ? message.text.trim() : "";

    if (!text) {
      sendResponse({
        ok: false,
        code: "NO_TEXT"
      });
      return false;
    }

    fillAndSubmit(text)
      .then(sendResponse)
      .catch(() => sendResponse({
        ok: false,
        code: "SUBMIT_FAILED"
      }));

    return true;
  });
  globalThis.__ljtcChatGptInstalled = true;
})();
