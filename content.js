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
  const SHEETS_BUTTON_CLASS = "ljtc-copy-button--sheets";
  const TOP_BUTTON_CLASS = "ljtc-copy-button--top";
  const DESCRIPTION_ACTION_ID = "ljtc-copy-about";
  const CHATGPT_ACTION_ID = "ljtc-send-chatgpt";
  const SHEETS_ACTION_ID = "ljtc-send-sheets";
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
        --ljtc-from: #23466d;
        --ljtc-to: #193653;
        --ljtc-accent: 119, 188, 255;
        align-items: center;
        background: linear-gradient(135deg, var(--ljtc-from), var(--ljtc-to));
        border: 1px solid rgba(var(--ljtc-accent), .32);
        border-radius: 12px;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .09), 0 2px 5px rgba(0, 0, 0, .12);
        color: #f3f8ff;
        cursor: pointer;
        display: inline-flex;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        gap: 7px;
        justify-content: center;
        line-height: 20px;
        min-height: 36px;
        padding: 7px 12px;
        position: relative;
        overflow: hidden;
        transition: transform 160ms ease, box-shadow 180ms ease, border-color 180ms ease, filter 180ms ease;
        white-space: nowrap;
        -webkit-tap-highlight-color: transparent;
      }

      .ljtc-copy-button::before {
        content: "";
        background: currentColor;
        display: block;
        flex: 0 0 16px;
        width: 16px;
        height: 16px;
        mask: var(--ljtc-icon) center / contain no-repeat;
        -webkit-mask: var(--ljtc-icon) center / contain no-repeat;
        opacity: .92;
      }

      .ljtc-copy-button--description {
        --ljtc-icon: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%228%22%20y%3D%228%22%20width%3D%2212%22%20height%3D%2213%22%20rx%3D%222%22%2F%3E%3Cpath%20d%3D%22M16%208V5a2%202%200%200%200-2-2H5a2%202%200%200%200-2%202v9a2%202%200%200%200%202%202h3%22%2F%3E%3C%2Fsvg%3E");
      }

      .ljtc-copy-button--chatgpt {
        --ljtc-icon: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m12%203%202.2%206.8L21%2012l-6.8%202.2L12%2021l-2.2-6.8L3%2012l6.8-2.2L12%203Z%22%2F%3E%3Cpath%20d%3D%22m20%203%20.5%201.5L22%205l-1.5.5L20%207l-.5-1.5L18%205l1.5-.5L20%203Z%22%2F%3E%3C%2Fsvg%3E");
      }

      .ljtc-copy-button--top {
        --ljtc-icon: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M9%205H6a2%202%200%200%200-2%202v12a2%202%200%200%200%202%202h12a2%202%200%200%200%202-2V7a2%202%200%200%200-2-2h-3%22%2F%3E%3Crect%20x%3D%229%22%20y%3D%223%22%20width%3D%226%22%20height%3D%224%22%20rx%3D%221%22%2F%3E%3Cpath%20d%3D%22m8%2014%203%203%205-6%22%2F%3E%3C%2Fsvg%3E");
      }

      .ljtc-copy-button--sheets {
        --ljtc-icon: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%224%22%20y%3D%223%22%20width%3D%2216%22%20height%3D%2218%22%20rx%3D%222%22%2F%3E%3Cpath%20d%3D%22M4%209h16M4%2015h16M10%209v12%22%2F%3E%3C%2Fsvg%3E");
      }

      .ljtc-copy-button--success:not(:disabled)::before {
        --ljtc-icon: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m5%2012%204%204L19%206%22%2F%3E%3C%2Fsvg%3E");
      }

      .ljtc-copy-button--description {
        min-width: 144px;
      }

      .ljtc-copy-button--chatgpt {
        --ljtc-from: #6540a4;
        --ljtc-to: #4c2f83;
        --ljtc-accent: 198, 169, 255;
        color: #f7f1ff;
        min-width: 158px;
      }

      .ljtc-copy-button--top {
        --ljtc-from: #815819;
        --ljtc-to: #634010;
        --ljtc-accent: 244, 201, 115;
        color: #fff3d5;
        min-width: 156px;
      }

      .ljtc-copy-button--sheets {
        --ljtc-from: #087b5c;
        --ljtc-to: #07634d;
        --ljtc-accent: 108, 232, 179;
        color: #edfff6;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .12), 0 3px 12px rgba(8, 123, 92, .2);
      }

      .ljtc-copy-button:hover:not(:disabled) {
        border-color: rgba(var(--ljtc-accent), .65);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .12), 0 4px 15px rgba(var(--ljtc-accent), .18);
        filter: brightness(1.12);
        transform: translateY(-1px);
      }

      .ljtc-copy-button:focus-visible {
        outline: 2px solid rgb(var(--ljtc-accent));
        outline-offset: 3px;
      }

      .ljtc-copy-button:active:not(:disabled) {
        transform: translateY(0) scale(.97);
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, .18);
      }

      .ljtc-copy-button:disabled {
        cursor: progress;
        filter: saturate(.8);
        opacity: .8;
      }

      .ljtc-copy-button:disabled::before {
        background: transparent;
        border: 1.5px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        box-sizing: border-box;
        mask: none;
        -webkit-mask: none;
        animation: ljtc-button-spin 750ms linear infinite;
      }

      .ljtc-copy-button--success {
        border-color: rgba(var(--ljtc-accent), .75);
        animation: ljtc-button-acknowledge 500ms ease-out;
      }

      @keyframes ljtc-button-spin {
        to { transform: rotate(360deg); }
      }

      @keyframes ljtc-button-acknowledge {
        0% { box-shadow: 0 0 0 0 rgba(var(--ljtc-accent), .35); }
        65% { box-shadow: 0 0 0 4px rgba(var(--ljtc-accent), .09); }
        100% { box-shadow: 0 0 0 6px rgba(var(--ljtc-accent), 0); }
      }

      .ljtc-top-button-wrapper {
        align-items: center;
        display: inline-flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-left: 4px;
        max-width: 100%;
        min-width: 0;
      }

      .ljtc-copy-button--description[hidden],
      .ljtc-copy-button--sheets[hidden],
      .ljtc-copy-button--chatgpt[hidden] {
        display: none;
      }

      [data-ljtc-placement="sdui-top-actions"] {
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      [data-ljtc-placement="sdui-top-actions"] > .ljtc-top-button-wrapper {
        flex: 0 0 100%;
        margin-left: 0;
      }

      [data-ljtc-placement="job-actions"] .ljtc-copy-button,
      [data-ljtc-placement="sdui-top-actions"] .ljtc-copy-button,
      .job-details-jobs-unified-top-card__top-buttons .ljtc-copy-button {
        min-height: 40px;
        padding-left: 12px;
        padding-right: 12px;
      }

      .ljtc-copy-button--sheets {
        position: relative;
        overflow: hidden;
        min-width: 116px;
      }

      .ljtc-copy-button--sheets.ljtc-sheets-celebrating {
        background: linear-gradient(120deg, #087b62, #14966c);
        box-shadow: 0 0 0 3px rgba(90, 222, 168, .16), 0 4px 20px rgba(16, 185, 129, .25);
        animation: ljtc-sheets-glow 950ms ease-out;
      }

      .ljtc-sheets-celebrating::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(110deg, transparent 25%, rgba(255, 255, 255, .32) 50%, transparent 75%);
        animation: ljtc-sheets-sheen 800ms cubic-bezier(.2, .7, .3, 1) both;
      }

      .ljtc-sheets-celebration {
        position: fixed;
        pointer-events: none;
        z-index: 2147483647;
      }

      .ljtc-sheets-celebration__ring {
        position: absolute;
        inset: 0;
        border: 1px solid rgba(118, 236, 186, .7);
        border-radius: 12px;
        animation: ljtc-sheets-ring 800ms ease-out both;
      }

      .ljtc-sheets-celebration__spark {
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 1px;
        background: #95efc6;
        box-shadow: 0 0 6px rgba(149, 239, 198, .4);
        animation: ljtc-sheets-spark 850ms cubic-bezier(.16, .8, .3, 1) both;
        animation-delay: var(--ljtc-delay);
      }

      .ljtc-sheets-celebration__spark:nth-child(3n) {
        background: #f3d992;
      }

      @keyframes ljtc-sheets-glow {
        0% { box-shadow: 0 0 0 0 rgba(90, 222, 168, .4); }
        45% { box-shadow: 0 0 0 5px rgba(90, 222, 168, .12), 0 4px 24px rgba(16, 185, 129, .3); }
      }

      @keyframes ljtc-sheets-sheen {
        from { transform: translateX(-110%); }
        to { transform: translateX(110%); }
      }

      @keyframes ljtc-sheets-ring {
        from { opacity: .8; transform: scale(1); }
        to { opacity: 0; transform: scale(1.2, 1.6); }
      }

      @keyframes ljtc-sheets-spark {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(.4) rotate(0deg); }
        15% { opacity: 1; }
        100% { opacity: 0; transform: translate(var(--ljtc-dx), var(--ljtc-dy)) scale(.2) rotate(100deg); }
      }

      .ljtc-confetti {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        max-width: none;
        max-height: none;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        overflow: hidden;
        pointer-events: none;
        user-select: none;
        z-index: 2147483647;
      }

      .ljtc-confetti::backdrop {
        background: transparent;
        pointer-events: none;
      }

      .ljtc-confetti__piece {
        position: absolute;
        top: -18px;
        pointer-events: none;
        opacity: 0;
        animation: ljtc-confetti-fall var(--ljtc-fall-time) linear var(--ljtc-fall-delay) both;
      }

      @keyframes ljtc-confetti-fall {
        0% { opacity: 0; transform: translate3d(0, -20px, 0) rotate(0deg); }
        8% { opacity: 1; }
        85% { opacity: 1; }
        100% { opacity: 0; transform: translate3d(var(--ljtc-drift), calc(100vh + 40px), 0) rotate(var(--ljtc-spin)) rotateX(360deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        .ljtc-copy-button,
        .ljtc-copy-button::before,
        .ljtc-copy-button:disabled::before {
          animation: none;
          transition: none;
        }
        .ljtc-copy-button:hover:not(:disabled),
        .ljtc-copy-button:active:not(:disabled) {
          transform: none;
        }
        .ljtc-copy-button--sheets.ljtc-sheets-celebrating,
        .ljtc-sheets-celebrating::after {
          animation: none;
        }
        .ljtc-sheets-celebrating::after,
        .ljtc-sheets-celebration,
        .ljtc-confetti {
          display: none;
        }
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

  function confirmExternalApplication(jobId, surface) {
    if (!jobId || getCurrentJobId() !== jobId || getJobSurface() !== surface) {
      return;
    }

    const yes = Array.from(surface.querySelectorAll(
      'a[aria-label="Did you finish applying? Yes"], button[aria-label="Did you finish applying? Yes"]'
    )).find((element) => {
      if (!isVisible(element) || element.disabled || element.getAttribute("aria-disabled") === "true") {
        return false;
      }

      const href = element.getAttribute("href");
      if (href) {
        const url = new URL(href, location.origin);
        const targetJobId = url.searchParams.get("currentJobId")
          || url.pathname.match(/\/jobs\/view\/(\d+)/)?.[1];
        return targetJobId === jobId;
      }

      return surface !== document;
    });

    yes?.click();
  }

  async function copyToClipboard(button, buildText) {
    const text = buildText();

    if (!text) {
      setButtonState(button, "No text", false);
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setButtonState(button, "Copied", true);
    } catch (error) {
      if (!fallbackCopy(text)) {
        setButtonState(button, "Copy failed", false);
        return false;
      }
      setButtonState(button, "Copied", true);
    }
    return true;
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
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
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
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const jobId = getCurrentJobId();
      const surface = getJobSurface();
      const copied = await copyToClipboard(button, buildText);
      if (copied && actionId === TOP_ACTION_ID) {
        confirmExternalApplication(jobId, surface);
      }
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

  function launchSheetsConfetti() {
    document.getElementById("ljtc-confetti")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "ljtc-confetti";
    overlay.className = "ljtc-confetti";
    overlay.setAttribute("aria-hidden", "true");
    const colors = ["#72e8ad", "#12b886", "#b4f4ce", "#f3cf79", "#c6a7ff", "#7acbff"];
    for (let index = 0; index < 110; index += 1) {
      const piece = document.createElement("span");
      piece.className = "ljtc-confetti__piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.backgroundColor = colors[index % colors.length];
      piece.style.width = `${5 + Math.random() * 5}px`;
      piece.style.height = `${5 + Math.random() * 8}px`;
      piece.style.borderRadius = index % 4 === 0 ? "50%" : "2px";
      piece.style.setProperty("--ljtc-drift", `${(Math.random() - .5) * 220}px`);
      piece.style.setProperty("--ljtc-spin", `${(Math.random() > .5 ? 1 : -1) * (360 + Math.random() * 540)}deg`);
      piece.style.setProperty("--ljtc-fall-time", `${2500 + Math.random() * 1100}ms`);
      piece.style.setProperty("--ljtc-fall-delay", `${Math.random() * 1400}ms`);
      overlay.appendChild(piece);
    }
    document.documentElement.appendChild(overlay);
    // A manual popover puts decoration in the browser's top layer, outside
    // page stacking contexts. The whole layer remains click-through.
    if (typeof overlay.showPopover === "function") {
      try {
        overlay.setAttribute("popover", "manual");
        overlay.showPopover();
      } catch (error) {
        overlay.removeAttribute("popover");
      }
    }
    window.setTimeout(() => overlay.remove(), 5100);
  }

  function celebrateSheetsSuccess(button) {
    if (!button.isConnected) return;
    button.classList.add("ljtc-sheets-celebrating");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) {
      launchSheetsConfetti();
      const rect = button.getBoundingClientRect();
      const effect = document.createElement("div");
      effect.className = "ljtc-sheets-celebration";
      effect.setAttribute("aria-hidden", "true");
      Object.assign(effect.style, {
        left: `${rect.left}px`, top: `${rect.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px`
      });
      const ring = document.createElement("span");
      ring.className = "ljtc-sheets-celebration__ring";
      effect.appendChild(ring);
      const sparks = [
        [0, 20, -24, -18], [25, 0, -8, -30], [75, 0, 10, -28],
        [100, 25, 26, -12], [100, 75, 22, 18], [70, 100, 8, 28],
        [25, 100, -10, 24], [0, 75, -26, 12]
      ];
      sparks.forEach(([x, y, dx, dy], index) => {
        const spark = document.createElement("span");
        spark.className = "ljtc-sheets-celebration__spark";
        spark.style.left = `${x}%`;
        spark.style.top = `${y}%`;
        spark.style.setProperty("--ljtc-dx", `${dx}px`);
        spark.style.setProperty("--ljtc-dy", `${dy}px`);
        spark.style.setProperty("--ljtc-delay", `${index * 18}ms`);
        effect.appendChild(spark);
      });
      document.body.appendChild(effect);
      window.setTimeout(() => effect.remove(), 1200);
    }
    window.setTimeout(() => button.classList.remove("ljtc-sheets-celebrating"), 1500);
  }

  async function sendToSheets(button) {
    if (button.disabled) return;
    const jobId = getCurrentJobId();
    const surface = getJobSurface();
    const text = buildTopClipboardText();
    if (!text) {
      setButtonState(button, "No text", false);
      return;
    }

    button.disabled = true;
    button.textContent = "Sending...";
    button.removeAttribute("title");
    try {
      const response = await chrome.runtime.sendMessage({ type: "LJTC_SEND_TO_SHEETS", text });
      if (response?.ok) {
        button.title = `Written to ${response.cell}; selected ${response.nextCell}.`;
        setButtonState(button, "Saved", true);
        if (getCurrentJobId() === jobId && getJobSurface() === surface) {
          celebrateSheetsSuccess(button);
        }
        confirmExternalApplication(jobId, surface);
      } else {
        const errors = {
          SHEETS_NOT_OPEN: ["Open Sheets", "Open a Google spreadsheet in this browser profile and select one cell."],
          SHEETS_BUSY: ["Please wait", "A Sheets transfer is already running."],
          SHEETS_SELECTION_REQUIRED: ["Select one cell", "Select a single cell in the last used Google Sheets tab."],
          SHEETS_EDITING: ["Finish editing", "Finish editing the current cell in Google Sheets first."],
          SHEETS_NOT_READY: ["Check Sheets", "The editable formula bar or name box was not found. Show the formula bar and check edit access."],
          SHEETS_SCRIPT_UNAVAILABLE: ["Check site access", "Reload the extension and allow its Google Sheets site and clipboard permissions."],
          SHEETS_PASTE_FAILED: ["Check Sheets", "The table cell could not be pasted into Sheets. Check Sheets before retrying."],
          SHEETS_VERIFY_FAILED: ["Check Sheets", "The write could not be confirmed. Check the selected cell before retrying to avoid duplicates."],
          SHEETS_NEXT_CELL_FAILED: ["Saved; check cell", "The text was saved, but selecting the cell below failed. Select the next cell manually before sending again."],
          SHEETS_CONNECTION_FAILED: ["Check Sheets", "The connection was interrupted. Check the table before retrying to avoid duplicates."]
        };
        const [label, detail] = errors[response?.code] || errors.SHEETS_CONNECTION_FAILED;
        const diagnostics = [response?.code, response?.stage,
          response?.cell && `Written cell: ${response.cell}`,
          response?.nextCell && `Target: ${response.nextCell}`,
          response?.selectedCell && `Selected: ${response.selectedCell}`,
          Number.isInteger(response?.actualLength) && `Read ${response.actualLength}/${response.expectedLength} characters`
        ].filter(Boolean).join("\n");
        button.title = `${detail}\n${diagnostics}`;
        setButtonState(button, label, false);
      }
    } catch (error) {
      button.title = "Check the table before retrying: the transfer may have completed.";
      setButtonState(button, "Check Sheets", false);
    } finally {
      button.disabled = false;
    }
  }

  function createSheetsButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${BUTTON_CLASS} ${SHEETS_BUTTON_CLASS}`;
    button.dataset.ljtcAction = SHEETS_ACTION_ID;
    button.dataset.defaultLabel = "To Sheets";
    button.dataset.ljtcRunId = RUN_ID;
    button.textContent = "To Sheets";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      sendToSheets(button);
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

    const sheetsButton = topButtons?.querySelector(`[data-ljtc-action="${SHEETS_ACTION_ID}"]`);
    if (sheetsButton) sheetsButton.hidden = hidden;
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
    const button = createCopyButton("Copy & confirm", TOP_BUTTON_CLASS, TOP_ACTION_ID, buildTopClipboardText);
    const wrapper = document.createElement("div");
    wrapper.className = "ljtc-top-button-wrapper";
    wrapper.appendChild(descriptionButton);
    wrapper.appendChild(chatGptButton);
    wrapper.appendChild(button);
    wrapper.appendChild(createSheetsButton());

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
