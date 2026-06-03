(() => {
  const ROOT_SELECTOR = ".jobs-search__job-details--wrapper, .jobs-details";
  const JOB_DETAILS_SELECTOR = "#job-details";
  const TOP_BUTTONS_SELECTOR = ".job-details-jobs-unified-top-card__top-buttons";
  const SHARE_SELECTOR = ".social-share";
  const BUTTON_CLASS = "ljtc-copy-button";
  const HEADER_BUTTON_CLASS = "ljtc-copy-button--header";
  const TOP_BUTTON_CLASS = "ljtc-copy-button--top";
  const HEADER_ACTION_ID = "ljtc-copy-about";
  const TOP_ACTION_ID = "ljtc-copy-top";

  let lastRun = 0;

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
    clone.querySelectorAll(`.${BUTTON_CLASS}, script, style, noscript`).forEach((node) => node.remove());
    return normalizeText(clone.innerText || clone.textContent || "");
  }

  function getTopCard() {
    return document.querySelector(".job-details-jobs-unified-top-card__container--two-pane");
  }

  function getJobTitle() {
    const title = document.querySelector(".job-details-jobs-unified-top-card__job-title h1");
    return getVisibleText(title);
  }

  function getCompanyName() {
    const company = document.querySelector(".job-details-jobs-unified-top-card__company-name");
    return getVisibleText(company);
  }

  function getPrimaryJobMeta() {
    const meta = document.querySelector(".job-details-jobs-unified-top-card__tertiary-description-container");
    if (!meta) {
      return "";
    }

    const clone = meta.cloneNode(true);
    clone.querySelectorAll("p").forEach((node) => node.remove());
    return normalizeText(clone.innerText || clone.textContent || "");
  }

  function getJobLocation() {
    return getPrimaryJobMeta().split(" · ")[0]?.trim() || "";
  }

  function getJobUrl() {
    const titleLink = document.querySelector(".job-details-jobs-unified-top-card__job-title h1 a[href]");
    const rawUrl = titleLink?.getAttribute("href") || location.href;
    const url = new URL(rawUrl, location.origin);
    const viewMatch = url.pathname.match(/\/jobs\/view\/(\d+)/);
    const searchMatch = location.search.match(/[?&]currentJobId=(\d+)/);
    const jobId = viewMatch?.[1] || searchMatch?.[1];

    return jobId ? `${location.origin}/jobs/view/${jobId}/` : url.href;
  }

  function getAboutJobText() {
    const jobDetails = document.querySelector(JOB_DETAILS_SELECTOR);
    return getVisibleText(jobDetails).replace(/^About the job\s*/i, "").trim();
  }

  function buildTopClipboardText() {
    return [
      getCompanyName(),
      getJobTitle(),
      getPrimaryJobMeta(),
      getJobUrl()
    ].filter(Boolean).join("\n\n");
  }

  function buildAboutClipboardText() {
    const about = getAboutJobText();

    return [
      getJobTitle(),
      getJobLocation(),
      about
    ].filter(Boolean).join("\n\n");
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
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      copyToClipboard(button, buildText);
    });
    return button;
  }

  function insertHeaderButton(jobDetails) {
    const heading = jobDetails?.querySelector("h2");
    if (!heading || heading.parentElement?.querySelector(`[data-ljtc-action="${HEADER_ACTION_ID}"]`)) {
      return;
    }

    const row = document.createElement("div");
    row.className = "ljtc-about-row";

    heading.parentNode.insertBefore(row, heading);
    row.appendChild(heading);
    row.appendChild(createCopyButton("Copy description", HEADER_BUTTON_CLASS, HEADER_ACTION_ID, buildAboutClipboardText));
  }

  function insertTopButton() {
    const topButtons = document.querySelector(TOP_BUTTONS_SELECTOR);
    if (!topButtons || topButtons.querySelector(`[data-ljtc-action="${TOP_ACTION_ID}"]`)) {
      return;
    }

    const share = topButtons.querySelector(SHARE_SELECTOR);
    const button = createCopyButton("Copy top", TOP_BUTTON_CLASS, TOP_ACTION_ID, buildTopClipboardText);
    const wrapper = document.createElement("div");
    wrapper.className = "ljtc-top-button-wrapper";
    wrapper.appendChild(button);

    if (share) {
      share.insertAdjacentElement("afterend", wrapper);
    } else {
      topButtons.insertBefore(wrapper, topButtons.firstChild);
    }
  }

  function enhanceLinkedInJob() {
    const now = Date.now();
    if (now - lastRun < 100) {
      return;
    }
    lastRun = now;

    const root = document.querySelector(ROOT_SELECTOR);
    const jobDetails = document.querySelector(JOB_DETAILS_SELECTOR);
    const topCard = getTopCard();

    if (!root || !jobDetails || !topCard) {
      return;
    }

    insertHeaderButton(jobDetails);
    insertTopButton();
  }

  const observer = new MutationObserver(enhanceLinkedInJob);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  enhanceLinkedInJob();
})();
