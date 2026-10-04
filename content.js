(() => {
  const JOB_DETAILS_SELECTOR = [
    "#job-details",
    '[componentkey^="JobDetails_AboutTheJob_"]',
    '[data-sdui-component*="aboutTheJob"]'
  ].join(", ");
  const TOP_BUTTONS_SELECTOR = ".job-details-jobs-unified-top-card__top-buttons";
  const SHARE_SELECTOR = ".social-share";
  const MORE_OPTIONS_SELECTOR = 'button[aria-label*="More options"]';
  const JOB_ACTIONS_SELECTOR = [
    'a[aria-label*="Apply"]',
    'button[aria-label*="Apply"]',
    'a[href*="/safety/go/"][href*="isSdui=true"]',
    'button[aria-label*="Save"]',
    'button[aria-label*="Saved"]',
    'button[aria-label*="Unsave"]'
  ].join(", ");
  const BUTTON_CLASS = "ljtc-copy-button";
  const DESCRIPTION_BUTTON_CLASS = "ljtc-copy-button--description";
  const CHATGPT_BUTTON_CLASS = "ljtc-copy-button--chatgpt";
  const TOP_BUTTON_CLASS = "ljtc-copy-button--top";
  const DESCRIPTION_ACTION_ID = "ljtc-copy-about";
  const CHATGPT_ACTION_ID = "ljtc-send-chatgpt";
  const TOP_ACTION_ID = "ljtc-copy-top";
  const STYLE_ID = "ljtc-inline-styles";
  const AUTO_DISMISS_APPLIED_MODAL_KEY = "autoDismissAppliedModal";
  const SETTINGS_UPDATED_MESSAGE = "LJTC_SETTINGS_UPDATED";
  const SEND_TO_CHATGPT_MESSAGE = "LJTC_SEND_TO_CHATGPT";
  const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  let enhanceTimer = null;
  let dismissTimer = null;
  let retryTimer = null;
  let retryDeadline = 0;
  let lastUrl = location.href;
  let autoDismissAppliedModal = false;
  let viewportUpdateFrame = null;

  function isJobsPage() {
    return location.hostname === "www.linkedin.com" && /^\/jobs(?:\/|$)/.test(location.pathname);
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ljtc-copy-button {
        align-items: center;
        background: #0a66c2;
        border: 0;
        border-radius: 999px;
        color: #fff;
        cursor: pointer;
        display: inline-flex;
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        justify-content: center;
        line-height: 20px;
        min-height: 32px;
        padding: 6px 14px;
        transition: background-color 120ms ease, box-shadow 120ms ease;
        white-space: nowrap;
      }

      .ljtc-copy-button:hover,
      .ljtc-copy-button:focus-visible {
        background: #004182;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
      }

      .ljtc-copy-button--success {
        background: #057642;
      }

      .ljtc-top-button-wrapper {
        align-items: center;
        display: inline-flex;
        gap: 8px;
        margin-left: 4px;
      }

      .ljtc-copy-button--description[hidden],
      .ljtc-copy-button--chatgpt[hidden] {
        display: none;
      }

      [data-ljtc-placement="sdui-top-actions"] {
        align-items: center;
        gap: 8px;
      }

      [data-ljtc-placement="job-actions"] .ljtc-copy-button,
      [data-ljtc-placement="sdui-top-actions"] .ljtc-copy-button,
      .job-details-jobs-unified-top-card__top-buttons .ljtc-copy-button {
        min-height: 40px;
        padding-left: 16px;
        padding-right: 16px;
      }

      .ljtc-hidden-textarea {
        left: -9999px;
        opacity: 0;
        position: fixed;
        top: -9999px;
      }
    `;

    document.documentElement.appendChild(style);
  }

  function normalizeText(text) {
    return text
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function getVisibleText(element) {
    if (!element) {
      return "";
    }

    const clone = element.cloneNode(true);
    clone
      .querySelectorAll(`.${BUTTON_CLASS}, script, style, noscript, [data-testid="expandable-text-button"]`)
      .forEach((node) => node.remove());
    return normalizeText(clone.innerText || clone.textContent || "");
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return rect.width > 0
      && rect.height > 0
      && style.display !== "none"
      && style.visibility !== "hidden";
  }

  function getCurrentJobId() {
    const searchJobId = new URLSearchParams(location.search).get("currentJobId");
    const viewMatch = location.pathname.match(/\/jobs\/view\/(\d+)/);

    return searchJobId || viewMatch?.[1] || "";
  }

  function hasMetadataSeparator(text) {
    return /[\u00b7\u2022]/.test(text);
  }

  function getTopCard() {
    return document.querySelector([
      ".job-details-jobs-unified-top-card__container--two-pane",
      ".job-details-jobs-unified-top-card__container",
      ".job-details-jobs-unified-top-card"
    ].join(", "));
  }

  function getJobTitleLink() {
    const jobId = getCurrentJobId();
    const currentJobLink = jobId
      ? document.querySelector(`a[href*="/jobs/view/${jobId}"]`)
      : null;

    if (currentJobLink) {
      return currentJobLink;
    }

    return document.querySelector(".job-details-jobs-unified-top-card__job-title h1 a[href]")
      || document.querySelector('a[href*="/jobs/view/"]');
  }

  function getJobSurface() {
    const titleLink = getJobTitleLink();

    return titleLink?.closest('[data-testid="lazy-column"][data-component-type="LazyColumn"]')
      || titleLink?.closest('[data-component-type="LazyColumn"]')
      || document.querySelector(".jobs-search__job-details--wrapper")
      || document.querySelector(".jobs-details")
      || document;
  }

  function getJobActionButtons() {
    const action = getJobSurface()?.querySelector(JOB_ACTIONS_SELECTOR);
    const actionWrapper = action?.closest("div");
    const actionsRow = actionWrapper?.parentElement;

    if (!actionsRow || isApplicationStatusElement(actionsRow)) {
      return null;
    }

    actionsRow.dataset.ljtcPlacement = "job-actions";
    return actionsRow;
  }

  function isApplicationStatusElement(element) {
    const text = getVisibleText(element.closest('[componentkey*="JobDetails"]') || element);
    return /\bApplication status\b/i.test(text)
      || /\bApplied on company site\b/i.test(text)
      || /\bYour profile was shared with the job poster\b/i.test(text);
  }

  function getSduiTopActions() {
    const surface = getJobSurface();
    const titleLink = getJobTitleLink();

    if (!surface || !titleLink || !surface.contains(titleLink)) {
      return null;
    }

    const moreButtons = Array.from(surface.querySelectorAll(MORE_OPTIONS_SELECTOR))
      .filter((button) => isVisible(button));
    const moreButton = moreButtons
      .filter((button) => Boolean(button.compareDocumentPosition(titleLink) & Node.DOCUMENT_POSITION_FOLLOWING))
      .at(-1) || moreButtons[0];
    const actionsRow = moreButton?.parentElement;

    if (!actionsRow) {
      return null;
    }

    actionsRow.dataset.ljtcPlacement = "sdui-top-actions";
    return actionsRow;
  }

  function getTopButtons() {
    return document.querySelector(TOP_BUTTONS_SELECTOR)
      || getTopCard()?.querySelector('[class*="top-buttons"]')
      || getSduiTopActions()
      || getJobActionButtons()
      || null;
  }

  function getJobTitle() {
    const title = document.querySelector(".job-details-jobs-unified-top-card__job-title h1");
    return getVisibleText(title) || getVisibleText(getJobTitleLink());
  }

  function getCompanyName() {
    const company = document.querySelector(".job-details-jobs-unified-top-card__company-name");
    const companyText = getVisibleText(company);

    if (companyText) {
      return companyText;
    }

    const companyLabel = getJobSurface()?.querySelector('[aria-label^="Company,"]')?.getAttribute("aria-label");
    if (companyLabel) {
      const companyName = companyLabel.replace(/^Company,\s*/i, "").trim();
      return companyName.endsWith("..") ? companyName.slice(0, -1) : companyName;
    }

    return getVisibleText(getJobSurface()?.querySelector('a[href*="/company/"]'));
  }

  function getPrimaryJobMeta() {
    const meta = document.querySelector(".job-details-jobs-unified-top-card__tertiary-description-container");
    if (!meta) {
      const titleLink = getJobTitleLink();
      const paragraphs = Array.from(getJobSurface()?.querySelectorAll("p") || []);
      const metaParagraph = paragraphs.find((paragraph) => {
        const text = getVisibleText(paragraph);
        const followsTitle = !titleLink
          || Boolean(titleLink.compareDocumentPosition(paragraph) & Node.DOCUMENT_POSITION_FOLLOWING);

        return followsTitle
          && hasMetadataSeparator(text)
          && !/Promoted by|Premium|followers|employees/i.test(text);
      });

      return getVisibleText(metaParagraph);
    }

    const clone = meta.cloneNode(true);
    clone.querySelectorAll("p").forEach((node) => node.remove());
    return normalizeText(clone.innerText || clone.textContent || "");
  }

  function getJobUrl() {
    const titleLink = getJobTitleLink();
    const rawUrl = titleLink?.getAttribute("href") || location.href;
    const url = new URL(rawUrl, location.origin);
    const viewMatch = url.pathname.match(/\/jobs\/view\/(\d+)/);
    const jobId = viewMatch?.[1] || getCurrentJobId();

    return jobId ? `${location.origin}/jobs/view/${jobId}/` : url.href;
  }

  function getAboutJobText() {
    const jobDetails = document.querySelector(JOB_DETAILS_SELECTOR);
    return getVisibleText(jobDetails).replace(/^About the job\s*/i, "").trim();
  }

  function getTopClipboardParts() {
    return [
      getCompanyName(),
      getJobTitle(),
      getPrimaryJobMeta()
    ].filter(Boolean);
  }

  function buildTopClipboardText() {
    return [...getTopClipboardParts(), getJobUrl()].filter(Boolean).join("\n\n");
  }

  function buildDescriptionClipboardText() {
    return [...getTopClipboardParts(), getAboutJobText()].filter(Boolean).join("\n\n");
  }

  async function copyToClipboard(button, buildText) {
    const text = buildText();

    if (!text) {
      setButtonState(button, "No text", false);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setButtonState(button, "Copied", true);
    } catch (error) {
      fallbackCopy(text);
      setButtonState(button, "Copied", true);
    }
  }

  async function sendToChatGpt(button, buildText) {
    const text = buildText();

    if (!text) {
      setButtonState(button, "No text", false);
      return;
    }

    button.disabled = true;
    button.textContent = "Sending...";
    button.removeAttribute("title");

    try {
      const response = await chrome.runtime.sendMessage({
        type: SEND_TO_CHATGPT_MESSAGE,
        text
      });

      if (!response?.ok) {
        const errors = {
          DRAFT_EXISTS: ["Draft exists", "ChatGPT already has a draft. Send or clear it before trying again."],
          CHATGPT_NOT_OPEN: ["Open ChatGPT", "Open a ChatGPT conversation in this browser profile."],
          CHATGPT_SCRIPT_UNAVAILABLE: ["Check site access", "The extension could not connect to ChatGPT. Check its access to chatgpt.com in the browser's extension settings."],
          CHATGPT_NOT_READY: ["ChatGPT not ready", "Wait for the ChatGPT page to finish loading, then try again."],
          CHATGPT_CONNECTION_FAILED: ["Check ChatGPT", "The connection to ChatGPT was interrupted. Check the conversation before trying again to avoid sending twice."],
          COMPOSER_NOT_FOUND: ["Chat field not found", "No unique, visible ChatGPT message field was found. Check that the selected tab is a conversation with an editable message field."],
          SEND_BUTTON_NOT_READY: ["Check ChatGPT", "The text was inserted, but ChatGPT's send button was not ready. Check the draft and send it manually."],
          SUBMIT_FAILED: ["Check ChatGPT", "ChatGPT could not complete the submission. Check its message field before trying again."],
          NO_TEXT: ["No text", "No job text was available to send."]
        };
        const [errorLabel, detail] = errors[response?.code] || [
          "Reload extension",
          "Reload LinkedIn Job Text Copier in the browser's extension settings, then refresh LinkedIn."
        ];
        button.title = response?.tabUrl ? `${detail}\nTarget tab: ${response.tabUrl}` : detail;
        setButtonState(button, errorLabel, false);
        return;
      }

      setButtonState(button, "Sent", true);
    } catch (error) {
      button.title = "Reload LinkedIn Job Text Copier in the browser's extension settings, then refresh LinkedIn.";
      setButtonState(button, "Reload extension", false);
    } finally {
      button.disabled = false;
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.className = "ljtc-hidden-textarea";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function setButtonState(button, label, success) {
    const originalLabel = button.dataset.defaultLabel || "Copy job";
    button.textContent = label;
    button.classList.toggle("ljtc-copy-button--success", success);

    window.setTimeout(() => {
      button.textContent = originalLabel;
      button.classList.remove("ljtc-copy-button--success");
    }, 1600);
  }

  function createCopyButton(label, extraClass, actionId, buildText) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${BUTTON_CLASS} ${extraClass}`;
    button.dataset.ljtcAction = actionId;
    button.dataset.defaultLabel = label;
    button.dataset.ljtcRunId = RUN_ID;
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      copyToClipboard(button, buildText);
    });
    return button;
  }

  function createChatGptButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${BUTTON_CLASS} ${CHATGPT_BUTTON_CLASS}`;
    button.dataset.ljtcAction = CHATGPT_ACTION_ID;
    button.dataset.defaultLabel = "Send to ChatGPT";
    button.dataset.ljtcRunId = RUN_ID;
    button.textContent = "Send to ChatGPT";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      sendToChatGpt(button, buildDescriptionClipboardText);
    });
    return button;
  }

  function removeLegacyHeaderButton() {
    document
      .querySelectorAll(`.ljtc-about-row [data-ljtc-action="${DESCRIPTION_ACTION_ID}"]`)
      .forEach((button) => button.remove());

    document.querySelectorAll(".ljtc-about-row").forEach((row) => {
      row.replaceWith(...row.childNodes);
    });
  }

  function isCompactTopBar(topButtons) {
    if (!isVisible(topButtons)) {
      return false;
    }

    const buttonsRect = topButtons.getBoundingClientRect();
    const surface = getJobSurface();
    const jobId = getCurrentJobId();
    const candidates = new Set([
      document.querySelector(".job-details-jobs-unified-top-card__job-title h1"),
      getJobTitleLink(),
      ...Array.from(surface?.querySelectorAll([
        "h1",
        '[class*="job-title"]',
        jobId ? `a[href*="/jobs/view/${jobId}"]` : 'a[href*="/jobs/view/"]'
      ].join(", ")) || [])
    ]);

    return Array.from(candidates).filter(Boolean).some((title) => {
      if (!isVisible(title) || topButtons.contains(title)) {
        return false;
      }

      const titleRect = title.getBoundingClientRect();
      const verticalOverlap = Math.min(titleRect.bottom, buttonsRect.bottom)
        - Math.max(titleRect.top, buttonsRect.top);

      return verticalOverlap > Math.min(titleRect.height, buttonsRect.height) * 0.25;
    });
  }

  function updateDescriptionButtonVisibility(topButtons) {
    const descriptionButton = topButtons?.querySelector(
      `[data-ljtc-action="${DESCRIPTION_ACTION_ID}"]`
    );
    const chatGptButton = topButtons?.querySelector(
      `[data-ljtc-action="${CHATGPT_ACTION_ID}"]`
    );
    const hidden = isCompactTopBar(topButtons);

    if (descriptionButton) {
      descriptionButton.hidden = hidden;
    }

    if (chatGptButton) {
      chatGptButton.hidden = hidden;
    }
  }

  function insertTopButton() {
    const topButtons = getTopButtons();
    if (!topButtons) {
      return;
    }

    document
      .querySelectorAll(`[data-ljtc-action="${TOP_ACTION_ID}"]`)
      .forEach((button) => {
        if (!topButtons.contains(button)) {
          button.closest(".ljtc-top-button-wrapper")?.remove();
          button.remove();
        }
      });

    const existingButton = topButtons.querySelector(`[data-ljtc-action="${TOP_ACTION_ID}"]`);
    if (existingButton?.dataset.ljtcRunId === RUN_ID) {
      updateDescriptionButtonVisibility(topButtons);
      return;
    }

    const existingWrapper = existingButton?.closest(".ljtc-top-button-wrapper");
    if (existingWrapper) {
      existingWrapper.remove();
    } else {
      existingButton?.remove();
    }

    const share = topButtons.querySelector(SHARE_SELECTOR);
    const descriptionButton = createCopyButton(
      "Copy description",
      DESCRIPTION_BUTTON_CLASS,
      DESCRIPTION_ACTION_ID,
      buildDescriptionClipboardText
    );
    const chatGptButton = createChatGptButton();
    const button = createCopyButton("Copy top", TOP_BUTTON_CLASS, TOP_ACTION_ID, buildTopClipboardText);
    const wrapper = document.createElement("div");
    wrapper.className = "ljtc-top-button-wrapper";
    wrapper.appendChild(descriptionButton);
    wrapper.appendChild(chatGptButton);
    wrapper.appendChild(button);

    if (share) {
      share.insertAdjacentElement("afterend", wrapper);
    } else if (["job-actions", "sdui-top-actions"].includes(topButtons.dataset.ljtcPlacement)) {
      topButtons.appendChild(wrapper);
    } else {
      topButtons.insertBefore(wrapper, topButtons.firstChild);
    }

    updateDescriptionButtonVisibility(topButtons);
  }

  function enhanceLinkedInJob() {
    if (!isJobsPage()) {
      return 0;
    }

    ensureStyles();
    removeLegacyHeaderButton();
    insertTopButton();
    scheduleDismissAppliedModal();

    return document.querySelectorAll(`[data-ljtc-run-id="${RUN_ID}"]`).length;
  }

  function isPostApplyModalText(text) {
    const hasPostApplyTitle = /Added to your applied jobs/i.test(text)
      || /Your application was sent to\b/i.test(text);
    const hasPostApplyContext = /Next,\s*continue your search/i.test(text)
      || /Applied"?\s+tab of My Jobs/i.test(text)
      || /There are more jobs similar to this one/i.test(text);

    return hasPostApplyTitle && hasPostApplyContext;
  }

  function getAppliedModalCloseButton(modal) {
    const closeButton = modal.querySelector([
      'button[aria-label="Dismiss"]',
      'button[aria-label="Close"]',
      'button[data-test-modal-close-btn]',
      ".artdeco-modal__dismiss"
    ].join(", "));

    if (closeButton) {
      return closeButton;
    }

    return Array.from(modal.querySelectorAll("button"))
      .find((button) => /^Not now$/i.test(getVisibleText(button)));
  }

  function dismissAppliedModal() {
    if (!autoDismissAppliedModal || !isJobsPage()) {
      return 0;
    }

    const modals = document.querySelectorAll([
      '[role="dialog"]',
      ".artdeco-modal",
      ".artdeco-modal-overlay"
    ].join(", "));
    let dismissedCount = 0;

    modals.forEach((modal) => {
      if (!isVisible(modal)) {
        return;
      }

      const modalText = normalizeText(modal.innerText || modal.textContent || "");

      if (!isPostApplyModalText(modalText)) {
        return;
      }

      const closeButton = getAppliedModalCloseButton(modal);

      if (closeButton) {
        closeButton.click();
        dismissedCount += 1;
      }
    });

    return dismissedCount;
  }

  function scheduleDismissAppliedModal(delay = 50) {
    if (!autoDismissAppliedModal || dismissTimer) {
      return;
    }

    dismissTimer = window.setTimeout(() => {
      dismissTimer = null;
      dismissAppliedModal();
    }, delay);
  }

  function scheduleEnhance(delay = 50) {
    if (enhanceTimer) {
      return;
    }

    enhanceTimer = window.setTimeout(() => {
      enhanceTimer = null;
      enhanceLinkedInJob();
    }, delay);
  }

  function scheduleViewportUpdate() {
    if (viewportUpdateFrame) {
      return;
    }

    viewportUpdateFrame = window.requestAnimationFrame(() => {
      viewportUpdateFrame = null;
      document
        .querySelectorAll(`[data-ljtc-action="${DESCRIPTION_ACTION_ID}"]`)
        .forEach((button) => {
          updateDescriptionButtonVisibility(button.closest(".ljtc-top-button-wrapper")?.parentElement);
        });
    });
  }

  function startRetryWindow() {
    if (!isJobsPage()) {
      return;
    }

    retryDeadline = Date.now() + 12000;
    scheduleEnhance(0);
    scheduleDismissAppliedModal(0);

    if (retryTimer) {
      return;
    }

    retryTimer = window.setInterval(() => {
      if (!isJobsPage() || Date.now() > retryDeadline) {
        window.clearInterval(retryTimer);
        retryTimer = null;
        return;
      }

      scheduleEnhance(0);
    }, 500);
  }

  function handleUrlChange() {
    if (location.href === lastUrl) {
      return;
    }

    lastUrl = location.href;
    startRetryWindow();
  }

  function patchHistoryMethod(methodName) {
    const original = history[methodName];

    history[methodName] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      window.setTimeout(handleUrlChange, 0);
      return result;
    };
  }

  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");

  function getStorageArea() {
    return chrome.storage?.sync || chrome.storage?.local || null;
  }

  async function loadSettings() {
    const storage = getStorageArea();

    if (!storage) {
      return;
    }

    try {
      const settings = await storage.get({
        [AUTO_DISMISS_APPLIED_MODAL_KEY]: false
      });

      autoDismissAppliedModal = Boolean(settings[AUTO_DISMISS_APPLIED_MODAL_KEY]);
    } catch (error) {
      autoDismissAppliedModal = false;
    }
  }

  function watchSettings() {
    if (!chrome.storage?.onChanged) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (!["sync", "local"].includes(areaName) || !changes[AUTO_DISMISS_APPLIED_MODAL_KEY]) {
        return;
      }

      autoDismissAppliedModal = Boolean(changes[AUTO_DISMISS_APPLIED_MODAL_KEY].newValue);
      scheduleDismissAppliedModal(0);
    });
  }

  window.addEventListener("popstate", handleUrlChange);
  window.addEventListener("scroll", scheduleViewportUpdate, true);
  window.addEventListener("resize", scheduleViewportUpdate);
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === SETTINGS_UPDATED_MESSAGE) {
      autoDismissAppliedModal = Boolean(message.settings?.[AUTO_DISMISS_APPLIED_MODAL_KEY]);
      scheduleDismissAppliedModal(0);
      sendResponse({
        ok: true
      });
      return false;
    }

    if (message?.type !== "LJTC_REFRESH_BUTTONS") {
      return false;
    }

    startRetryWindow();

    window.setTimeout(() => {
      sendResponse({
        isJobsPage: isJobsPage(),
        buttonCount: enhanceLinkedInJob()
      });
    }, 50);

    return true;
  });

  const observer = new MutationObserver(() => {
    if (isJobsPage()) {
      scheduleEnhance();
      scheduleDismissAppliedModal();
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.setInterval(handleUrlChange, 1000);
  watchSettings();

  loadSettings().finally(() => {
    startRetryWindow();
    scheduleDismissAppliedModal(0);
  });
})();
