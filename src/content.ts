import { listen, settingsUpdated, refreshButtonsMessage, sendRuntime, sendChatGpt, sendSheets, openPopup, isRecord, readSettings, errorMessage, type ButtonAction, type JobCard, type NavigationCard, type RemovedJobAnchor } from "./contracts";
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
  const DISMISS_ACTION_ID = "ljtc-dismiss-job";
  const STYLE_ID = "ljtc-inline-styles";
  const HIDE_APPLIED_JOBS_KEY = "hideAppliedJobs";
  const AUTO_DISMISS_APPLIED_MODAL_KEY = "autoDismissAppliedModal";
  const SETTINGS_UPDATED_MESSAGE = "LJTC_SETTINGS_UPDATED";
  const SEND_TO_CHATGPT_MESSAGE = "LJTC_SEND_TO_CHATGPT";
  const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  let enhanceTimer: number | null = null;
  let retryTimer: number | null = null;
  let retryDeadline = 0;
  let lastUrl = location.href;
  let autoDismissAppliedModal = false;
  let hideAppliedJobs = true;
  let viewportUpdateFrame: number | null = null;

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
      .ljtc-applied-hidden { display: none !important; }
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
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 176px), 1fr));
        gap: 8px;
        flex: 1 0 100%;
        box-sizing: border-box;
        width: 100%;
        margin-left: 0;
        max-width: 100%;
        min-width: 0;
      }

      .ljtc-top-button-wrapper > .ljtc-copy-button {
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        height: 44px;
        min-height: 44px;
        max-height: 44px;
        padding: 5px 10px;
        line-height: 16px;
        white-space: normal;
        overflow-wrap: anywhere;
      }

      .ljtc-description-controls {
        display: flex;
        gap: 6px;
        min-width: 0;
      }

      .ljtc-description-controls > .ljtc-copy-button {
        box-sizing: border-box;
        height: 44px;
        min-height: 44px;
        max-height: 44px;
        min-width: 0;
        padding: 5px 6px;
        line-height: 16px;
      }

      .ljtc-description-controls > .ljtc-copy-button--description {
        flex: 1;
        white-space: normal;
        overflow-wrap: anywhere;
      }

      .ljtc-description-controls > .ljtc-copy-button--description::before {
        display: none;
      }

      .ljtc-description-controls > .ljtc-copy-button--settings {
        flex: 0 0 38px;
        padding: 0;
        --ljtc-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m9 3-.6 2.4-2 .9L4.2 6l-2 3.5L4 11v2l-1.8 1.5 2 3.5 2.2-.3 2 .9L9 21h6l.6-2.4 2-.9 2.2.3 2-3.5L20 13v-2l1.8-1.5-2-3.5-2.2.3-2-.9L15 3Z'/%3E%3Ccircle cx='12' cy='12' r='3'/%3E%3C/svg%3E");
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

.ljtc-copy-button.ljtc-copy-button--dismiss {
  --ljtc-from: #50565e;
  --ljtc-to: #383e46;
  --ljtc-accent: 182, 190, 201;
  --ljtc-icon: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m3%203%2018%2018M10.6%2010.6a2%202%200%200%200%202.8%202.8M9.9%205.2A11%2011%200%200%201%2012%205c6%200%2010%207%2010%207a19%2019%200%200%201-4%204.5M6.5%206.5A22%2022%200%200%200%202%2012s4%207%2010%207a11%2011%200%200%200%205-1.2%22%2F%3E%3C%2Fsvg%3E");
}
.ljtc-copy-button.ljtc-copy-button--undo-dismiss { --ljtc-icon: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m9%204-6%206%206%206M3%2010h11a6%206%200%200%201%200%2012%22%2F%3E%3C%2Fsvg%3E"); }
.ljtc-copy-button--apply { --ljtc-icon: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M14%203h7v7M21%203%2010%2014M10%203H5a2%202%200%200%200-2%202v14a2%202%200%200%200%202%202h14a2%202%200%200%200%202-2v-5%22%2F%3E%3C%2Fsvg%3E"); }
.ljtc-copy-button--previous { --ljtc-icon: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m12%205-7%207%207%207M5%2012h15%22%2F%3E%3C%2Fsvg%3E"); }
.ljtc-copy-button--next { --ljtc-icon: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m12%205%207%207-7%207M19%2012H4%22%2F%3E%3C%2Fsvg%3E"); flex-direction: row-reverse; }
.ljtc-job-navigation {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-column: 1 / -1;
  gap: 8px;
}
.ljtc-job-navigation > button { width: 100%; min-width: 0; }
.ljtc-job-navigation > button:disabled,
.ljtc-copy-button--apply:disabled { cursor: default; opacity: .45; }
.ljtc-job-navigation > button:disabled::before,
.ljtc-copy-button--apply:disabled::before {
  background: currentColor;
  border: 0;
  border-radius: 0;
  mask: var(--ljtc-icon) center / contain no-repeat;
  -webkit-mask: var(--ljtc-icon) center / contain no-repeat;
  animation: none;
}
    `;

    document.documentElement.appendChild(style);
  }

  function normalizeText(text: string) {
    return text
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // cloneNode preserves the element interface; lib.dom returns only Node.
  function cloneElement(element: HTMLElement): HTMLElement {
    return element.cloneNode(true) as HTMLElement;
  }

  function getVisibleText(element: HTMLElement | null | undefined) {
    if (!element) {
      return "";
    }

    const clone = cloneElement(element);
    clone
      .querySelectorAll<HTMLElement>(`.${BUTTON_CLASS}, script, style, noscript, [data-testid="expandable-text-button"]`)
      .forEach((node) => node.remove());
    return normalizeText(clone.innerText || clone.textContent || "");
  }

  function isVisible(element: Element | null | undefined) {
    if (!element) return false;
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

  function getLinkedJobId(link: Element) {
    const url = new URL(link.getAttribute("href") || "", location.origin);
    return url.pathname.match(/\/jobs\/view\/(\d+)(?:\/|$)/)?.[1] || "";
  }

  function isUndoDismissButton(button: Element) {
    return /\bjob is dismissed,\s*undo\s*$/i.test(button.getAttribute("aria-label") || "");
  }

  function getCurrentJobDismissButton() {
    const jobId = getCurrentJobId();
    if (!/^\d+$/.test(jobId)) {
      return null;
    }

    const links = Array.from(document.querySelectorAll<HTMLElement>('a[href*="/jobs/view/"]'));
    const roots = [
      ...links.filter((link) => getLinkedJobId(link) === jobId),
      ...document.querySelectorAll<HTMLElement>(`[data-job-id="${jobId}"], [data-occludable-job-id="${jobId}"], [componentkey="job-card-component-ref-${jobId}"]`)
    ];
    const candidates = new Set<HTMLButtonElement>();

    for (const root of roots) {
      for (let card: HTMLElement | null = root; card && card !== document.body; card = card.parentElement) {
        // Never search an enclosing list: its first cross may belong to another job.
        const otherJob = Array.from(card.querySelectorAll<HTMLElement>('a[href*="/jobs/view/"]'))
          .some((link) => getLinkedJobId(link) && getLinkedJobId(link) !== jobId);
        const otherCard = Array.from(card.querySelectorAll<HTMLElement>('[data-job-id], [data-occludable-job-id], [componentkey^="job-card-component-ref-"]'))
          .some((node) => (node.getAttribute("data-job-id")
            || node.getAttribute("data-occludable-job-id")
            || node.getAttribute("componentkey")?.replace(/^job-card-component-ref-/, "")) !== jobId);
        if (otherJob || otherCard) {
          break;
        }

        const buttons = Array.from(card.querySelectorAll<HTMLButtonElement>("button"))
          .filter((button) => {
            const label = button.getAttribute("aria-label") || "";
            return (isUndoDismissButton(button) || /^(?:Dismiss|Hide)\b.+\bjob\b/i.test(label)
              || (/^(?:Dismiss|Hide)$/i.test(label)
                && button.classList.contains("job-card-container__action")))
              && !button.dataset.ljtcAction && !button.disabled && isVisible(button);
          });
        if (buttons.length) {
          buttons.forEach((button) => candidates.add(button));
          break;
        }
      }
    }

    return candidates.size === 1 ? [...candidates][0] : null;
  }

  // Keep the removed selection's position until the user opens another job.
  let removedJobAnchor: RemovedJobAnchor | null = null;

  function getJobListCards(): JobCard[] {
    const selector = '[componentkey^="job-card-component-ref-"][role="button"], li[data-occludable-job-id], li[data-job-id], .job-card-container[data-job-id]';
    const seen = new Set();
    return Array.from(document.querySelectorAll<HTMLElement>(selector)).flatMap((node) => {
      const id = node.getAttribute("data-occludable-job-id") || node.getAttribute("data-job-id")
        || node.getAttribute("componentkey")?.replace(/^job-card-component-ref-/, "");
      if (!id || !/^\d+$/.test(id) || seen.has(id)) return [];
      seen.add(id);
      return [{ id, node }];
    });
  }

  function isAppliedJobCard(node: HTMLElement) {
    // Exact status labels only: a title/company containing 'Applied' is not a status.
    return Array.from(node.querySelectorAll<HTMLElement>('p, span, li, time, .job-card-container__footer-item'))
      .some((label) => /^(?:Applied|Applied on .+|Application submitted|Solicitud enviada|Candidatura enviada|Bewerbung gesendet|Beworben|Candidature envoyée)(?:\s*[·•].*)?$/i
        .test(normalizeText(label.textContent || "")));
  }

  function removeAppliedJobCards() {
    const cards = getJobListCards();
    const currentId = getCurrentJobId();
    if (removedJobAnchor?.id !== currentId) removedJobAnchor = null;
    const index = cards.findIndex((card) => card.id === currentId);
    const applied = cards.filter(({ node }) => hideAppliedJobs && isAppliedJobCard(node));
    if (index >= 0 && !removedJobAnchor && applied.some((card) => card.id === currentId)) {
      removedJobAnchor = { id: currentId,
        previous: cards.slice(0, index).map((card) => card.id).reverse(),
        next: cards.slice(index + 1).map((card) => card.id) };
    }
    for (const { node } of cards) {
      const hidden = hideAppliedJobs && isAppliedJobCard(node);
      if (node.classList.contains("ljtc-applied-hidden") !== hidden) {
        node.classList.toggle("ljtc-applied-hidden", hidden);
      }
    }
    if (!hideAppliedJobs) removedJobAnchor = null;
  }

  function getAdjacentJob(direction: number) {
    const cards = getJobListCards();
    const currentId = getCurrentJobId();
    const index = cards.findIndex((card) => card.id === currentId);
    if (index >= 0) {
      for (let i = index + direction; i >= 0 && i < cards.length; i += direction) {
        if (isVisible(cards[i].node) && (!hideAppliedJobs || !isAppliedJobCard(cards[i].node))) return cards[i];
      }
    } else if (removedJobAnchor?.id === currentId) {
      const ids = direction < 0 ? removedJobAnchor.previous : removedJobAnchor.next;
      for (const id of ids) {
        const card = cards.find((candidate) => candidate.id === id);
        if (card && isVisible(card.node) && (!hideAppliedJobs || !isAppliedJobCard(card.node))) return card;
      }
    }
    return null;
  }

  function navigateJob(direction: number) {
    removeAppliedJobCards();
    const card = getAdjacentJob(direction);
    if (!card) return;
    const target = card.node.getAttribute("role") === "button" ? card.node
      : card.node.querySelector<HTMLElement>('a[href*="/jobs/view/"]');
    if (!target) return;
    card.node.scrollIntoView({ block: "nearest" });
    target.click();
  }

  function getNativeApplyButton() {
    const surface = getJobSurface();
    return Array.from(surface.querySelectorAll<HTMLElement>('button, a[href]')).find((node) => {
      if (node.dataset.ljtcAction || node.closest<HTMLElement>('.ljtc-top-button-wrapper')
        || node.closest<HTMLElement>('[role="dialog"], [componentkey^="job-card-component-ref-"], .job-card-container')
        || ("disabled" in node && node.disabled) || node.getAttribute("aria-disabled") === "true" || !isVisible(node)) return false;
      const label = normalizeText(node.getAttribute("aria-label") || node.textContent || "");
      return /^(?:Easy Apply|Apply)(?:$|\s+(?:on|to|for|now|with)\b)/i.test(label);
    }) || null;
  }

  function updateJobControls(wrapper: Element | null) {
    if (!wrapper) return;
    for (const direction of [-1, 1]) {
      const button = wrapper.querySelector<HTMLButtonElement>(`[data-ljtc-action="ljtc-${direction < 0 ? "previous" : "next"}-job"]`);
      const disabled = !getAdjacentJob(direction);
      if (button && button.disabled !== disabled) button.disabled = disabled;
    }
    const apply = wrapper.querySelector<HTMLButtonElement>('[data-ljtc-action="ljtc-apply-job"]');
    if (apply) {
      const native = getNativeApplyButton();
      const label = native && /Easy Apply/i.test(native.getAttribute("aria-label") || native.textContent || "")
        ? "Easy Apply" : "Apply";
      if (apply.textContent !== label) apply.textContent = label;
      if (apply.disabled !== !native) apply.disabled = !native;
      apply.title = native ? "Open this job's native LinkedIn application action." : "No available Apply action for this job.";
    }
  }

  function createJobControl(action: ButtonAction, label: string, className: string, handler: () => void) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${BUTTON_CLASS} ${className}`;
    button.dataset.ljtcAction = action;
    button.dataset.ljtcRunId = RUN_ID;
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handler();
    });
    return button;
  }

  function hasMetadataSeparator(text: string) {
    return /[\u00b7\u2022]/.test(text);
  }

  function getTopCard() {
    return document.querySelector<HTMLElement>([
      ".job-details-jobs-unified-top-card__container--two-pane",
      ".job-details-jobs-unified-top-card__container",
      ".job-details-jobs-unified-top-card"
    ].join(", "));
  }

  function getJobTitleLink() {
    const jobId = getCurrentJobId();
    const currentJobLink = jobId
      ? document.querySelector<HTMLElement>(`a[href*="/jobs/view/${jobId}"]`)
      : null;

    if (currentJobLink) {
      return currentJobLink;
    }

    return document.querySelector<HTMLElement>(".job-details-jobs-unified-top-card__job-title h1 a[href]")
      || document.querySelector<HTMLElement>('a[href*="/jobs/view/"]');
  }

  function getJobSurface() {
    const titleLink = getJobTitleLink();

    return titleLink?.closest<HTMLElement>('[data-testid="lazy-column"][data-component-type="LazyColumn"]')
      || titleLink?.closest<HTMLElement>('[data-component-type="LazyColumn"]')
      || document.querySelector<HTMLElement>(".jobs-search__job-details--wrapper")
      || document.querySelector<HTMLElement>(".jobs-details")
      || document;
  }

  function getJobActionButtons() {
    const action = getJobSurface()?.querySelector<HTMLElement>(JOB_ACTIONS_SELECTOR);
    const actionWrapper = action?.closest<HTMLElement>("div");
    const actionsRow = actionWrapper?.parentElement;

    if (!actionsRow || isApplicationStatusElement(actionsRow)) {
      return null;
    }

    actionsRow.dataset.ljtcPlacement = "job-actions";
    return actionsRow;
  }

  function isApplicationStatusElement(element: HTMLElement) {
    const text = getVisibleText(element.closest<HTMLElement>('[componentkey*="JobDetails"]') || element);
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

    const moreButtons = Array.from(surface.querySelectorAll<HTMLElement>(MORE_OPTIONS_SELECTOR))
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
    return document.querySelector<HTMLElement>(TOP_BUTTONS_SELECTOR)
      || getTopCard()?.querySelector<HTMLElement>('[class*="top-buttons"]')
      || getSduiTopActions()
      || getJobActionButtons()
      || null;
  }

  function getJobTitle() {
    const title = document.querySelector<HTMLElement>(".job-details-jobs-unified-top-card__job-title h1");
    return getVisibleText(title) || getVisibleText(getJobTitleLink());
  }

  function getCompanyName() {
    const company = document.querySelector<HTMLElement>(".job-details-jobs-unified-top-card__company-name");
    const companyText = getVisibleText(company);

    if (companyText) {
      return companyText;
    }

    const companyLabel = getJobSurface()?.querySelector<HTMLElement>('[aria-label^="Company,"]')?.getAttribute("aria-label");
    if (companyLabel) {
      const companyName = companyLabel.replace(/^Company,\s*/i, "").trim();
      return companyName.endsWith("..") ? companyName.slice(0, -1) : companyName;
    }

    return getVisibleText(getJobSurface()?.querySelector<HTMLElement>('a[href*="/company/"]'));
  }

  function getPrimaryJobMeta() {
    const meta = document.querySelector<HTMLElement>(".job-details-jobs-unified-top-card__tertiary-description-container");
    if (!meta) {
      const titleLink = getJobTitleLink();
      const paragraphs = Array.from(getJobSurface()?.querySelectorAll<HTMLElement>("p") || []);
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

    const clone = cloneElement(meta);
    clone.querySelectorAll<HTMLElement>("p").forEach((node) => node.remove());
    return normalizeText(clone.innerText || clone.textContent || "");
  }

  function getJobAttributeMeta() {
    // SDUI uses rotating class names. Read the chips in the title's nearest
    // header, stopping before descriptions/recommendations and the results list.
    const surface = getJobSurface();
    const readChips = (root: HTMLElement) => {
      const values = Array.from(root.querySelectorAll<HTMLElement>(
        'a, button, .job-details-jobs-unified-top-card__job-insight span[aria-hidden="true"]'
      )).filter(isVisible).map((node) => {
        const clone = cloneElement(node);
        clone.querySelectorAll<HTMLElement>('.visually-hidden, .sr-only, [aria-hidden="true"] svg')
          .forEach((child) => child.remove());
        return getVisibleText(clone).replace(/^[✓✔]\s*/, "").trim();
      }).filter((text) => {
        const workplace = /^(?:Hybrid|Remote|On[ -]site)$/i.test(text);
        const employment = /^(?:Full[ -]time|Part[ -]time|Contract|Temporary|Internship|Volunteer|Other)$/i.test(text);
        const salary = text.length <= 100 && /\d/.test(text)
          && /(?:[$€£]|\b(?:EUR|USD|GBP|CHF|CAD|AUD|PLN|CZK|SEK|NOK|DKK)\b)/i.test(text);
        return workplace || employment || salary;
      });
      return [...new Set(values)].join(" · ");
    };
    const topCard = getTopCard();
    if (topCard && surface.contains(topCard)) return readChips(topCard);
    for (let header = getJobTitleLink()?.parentElement; header && header !== surface; header = header.parentElement) {
      if (header.querySelector<HTMLElement>('h2, ' + JOB_DETAILS_SELECTOR)
        || header.matches('[role="button"], li[data-job-id], li[data-occludable-job-id]')) break;
      const text = readChips(header);
      if (text) return text;
    }
    return "";
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
    const surface = getJobSurface();
    const jobDetails = surface.querySelector<HTMLElement>(JOB_DETAILS_SELECTOR);
    const text = getVisibleText(jobDetails).replace(/^About the job\s*/i, "").trim();
    if (text) {
      return text;
    }

    // New SDUI layouts give this section a random componentkey. Locate its
    // description by the heading, without collecting neighbouring company cards.
    const heading = Array.from(surface.querySelectorAll<HTMLElement>("h2"))
      .find((node) => /^About the job$/i.test(getVisibleText(node)));
    for (let section = heading?.parentElement; section && section !== surface; section = section.parentElement) {
      if (section.querySelectorAll<HTMLElement>("h2").length !== 1) {
        break;
      }
      const description = section.querySelector<HTMLElement>('[data-testid="expandable-text-box"]');
      const descriptionText = getVisibleText(description);
      if (descriptionText) {
        return descriptionText;
      }
    }
    return "";
  }

  function getTopClipboardParts() {
    return [
      getCompanyName(),
      getJobTitle(),
      getPrimaryJobMeta(),
      getJobAttributeMeta()
    ].filter(Boolean);
  }

  function buildTopClipboardText() {
    return [...getTopClipboardParts(), getJobUrl()].filter(Boolean).join("\n\n");
  }

  function buildDescriptionClipboardText() {
    const description = getAboutJobText();
    return description ? [...getTopClipboardParts(), description].filter(Boolean).join("\n\n") : "";
  }

  function confirmExternalApplication(jobId: string, surface: ParentNode) {
    if (!jobId || getCurrentJobId() !== jobId || getJobSurface() !== surface) {
      return;
    }

    const yes = Array.from(surface.querySelectorAll<HTMLElement>(
      'a[aria-label="Did you finish applying? Yes"], button[aria-label="Did you finish applying? Yes"]'
    )).find((element) => {
      if (!isVisible(element) || ("disabled" in element && element.disabled) || element.getAttribute("aria-disabled") === "true") {
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

  async function copyToClipboard(button: HTMLButtonElement, buildText: () => string) {
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

  async function sendToChatGpt(button: HTMLButtonElement, buildText: () => string) {
    const text = buildText();

    if (!text) {
      setButtonState(button, "No text", false);
      return;
    }

    button.disabled = true;
    button.textContent = "Sending...";
    button.removeAttribute("title");

    try {
      const response = await sendRuntime(sendChatGpt, {
        type: SEND_TO_CHATGPT_MESSAGE,
        text
      });

      if (!response?.ok) {
        const errors: Partial<Record<string, [string, string]>> = {
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
        const [errorLabel, detail] = errors[response.code] || [
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

  function fallbackCopy(text: string) {
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

  function setButtonState(button: HTMLButtonElement, label: string, success: boolean) {
    const originalLabel = button.dataset.defaultLabel || "Copy job";
    button.textContent = label;
    button.classList.toggle("ljtc-copy-button--success", success);

    window.setTimeout(() => {
      button.textContent = button.dataset.defaultLabel || originalLabel;
      if (success && button.dataset.defaultTitle) button.title = button.dataset.defaultTitle;
      button.classList.remove("ljtc-copy-button--success");
    }, 1600);
  }

  function createCopyButton(label: string, extraClass: string, actionId: ButtonAction, buildText: () => string) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${BUTTON_CLASS} ${extraClass}`;
    button.dataset.ljtcAction = actionId;
    button.dataset.defaultLabel = label;
    button.dataset.ljtcRunId = RUN_ID;
    button.textContent = label;
    button.title = actionId === TOP_ACTION_ID
      ? "Copy job details and link. Also mark this job as applied if LinkedIn shows a Yes confirmation. Does not submit an application."
      : "Copy company, title, job details and the full job description, without the link.";
    button.dataset.defaultTitle = button.title;
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
    button.title = "Send the full job description as a message in your most recently used open ChatGPT tab. Sends immediately; existing drafts are preserved.";
    button.dataset.defaultTitle = button.title;
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

  function celebrateSheetsSuccess(button: HTMLButtonElement) {
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

  function getJobCards(): NavigationCard[] {
    const root = document.querySelector<HTMLElement>('[componentkey="SearchResultsMainContent"]')
      || document.querySelector<HTMLElement>('.jobs-search-results-list')
      || document;
    const selectors = [
      '[role="button"][componentkey^="job-card-component-ref-"]',
      'li[data-occludable-job-id]',
      '.job-card-container[data-job-id]'
    ];
    for (const selector of selectors) {
      const cards = Array.from(root.querySelectorAll<HTMLElement>(selector)).map((element) => ({
        element,
        id: element.getAttribute('data-occludable-job-id')
          || element.getAttribute('data-job-id')
          || element.getAttribute('componentkey')?.match(/^job-card-component-ref-(\d+)/)?.[1]
      })).filter((card): card is NavigationCard => typeof card.id === "string" && card.id.length > 0);
      if (cards.length) return cards;
    }
    return [];
  }

  async function openNextJobAfterSheets(jobId: string, report: (message: string) => void = () => {}) {
    // Confirming Yes can replace the details DOM without changing the job.
    // Only a different job or real user input should cancel navigation.
    if (!jobId) {
      report('Stopped: current job ID is missing.');
      return;
    }
    if (getCurrentJobId() !== jobId) {
      report('Stopped: selected job changed.');
      return;
    }
    let cancelled = false;
    const cancel = (event: Event) => { if (event.isTrusted) cancelled = true; };
    const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
    document.addEventListener('pointerdown', cancel, true);
    document.addEventListener('keydown', cancel, true);
    try {
      report('Waiting 600 ms before opening the next job.');
      await pause(600);
      if (cancelled || getCurrentJobId() !== jobId) {
        report(cancelled ? 'Stopped: mouse or keyboard input during navigation.' : 'Stopped: selected job changed.');
        return;
      }
      const cards = getJobCards();
      const index = cards.findIndex((card) => card.id === jobId);
      // Applied jobs can remain mounted but hidden in the left list. Keep their
      // position so completing Easy Apply advances forward instead of stopping.
      // If the card was removed entirely, resume from the first visible result.
      const candidates = index < 0 && removedJobAnchor?.id === jobId
        ? removedJobAnchor.next.map((id) => cards.find((card) => card.id === id)).filter((card): card is NavigationCard => card !== undefined)
        : cards.slice(index + 1);
      const nextCard = candidates.find((card) => isVisible(card.element));
      if (nextCard) {
        nextCard.element.click();
        report(`Clicked next job ${nextCard.id}; selected job now ${getCurrentJobId() || 'none'}.`);
        return;
      }
      const nextButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(
        'button[data-testid="pagination-controls-next-button-visible"], button[aria-label="View next page"]'
      ));
      const next = nextButtons.find((button) => isVisible(button) && !button.disabled
        && button.getAttribute('aria-disabled') !== 'true');
      if (!next) {
        report(`Stopped at last visible job ${jobId}: ${nextButtons.length ? 'Next button hidden or disabled' : 'Next button not found'}.`);
        return;
      }
      const previousIds = new Set(cards.map((card) => card.id));
      next.click();
      report(`Clicked Next after job ${jobId}; waiting for new results.`);
      // LinkedIn may keep the old cards mounted while the next page loads.
      for (let attempt = 0; attempt < 54; attempt += 1) {
        await pause(150);
        // If LinkedIn selects a job itself, keep that selection too.
        if (cancelled || getCurrentJobId() !== jobId) {
          report(cancelled ? 'Stopped: mouse or keyboard input while loading results.'
            : `Selected job changed after Next: ${getCurrentJobId() || 'none'}.`);
          return;
        }
        const first = getJobCards().find((card) => isVisible(card.element));
        if (first && !previousIds.has(first.id)) {
          first.element.click();
          report(`Clicked first job on next page: ${first.id}.`);
          return;
        }
      }
      report('Next was clicked, but new results did not appear within 8 seconds.');
    } finally {
      document.removeEventListener('pointerdown', cancel, true);
      document.removeEventListener('keydown', cancel, true);
    }
  }

  async function sendToSheets(button: HTMLButtonElement) {
    if (button.disabled) return;
    const jobId = getCurrentJobId();
    const surface = getJobSurface();
    const reportNavigation = (message: string) => {
      button.title = `Sheets navigation v3\n${button.dataset.ljtcSheetsReceipt || 'Transfer in progress.'}\n${message}`;
    };
    const text = buildTopClipboardText();
    if (!text) {
      setButtonState(button, "No text", false);
      return;
    }

    button.disabled = true;
    button.textContent = "Sending...";
    button.removeAttribute("title");
    button.dataset.ljtcSheetsReceipt = '';
    reportNavigation('Waiting for Sheets confirmation.');
    try {
      const response = await sendRuntime(sendSheets, { type: "LJTC_SEND_TO_SHEETS", text });
      if (response?.ok) {
        button.dataset.ljtcSheetsReceipt = `Written to ${response.cell}; selected ${response.nextCell}.`;
        reportNavigation('Sheets write confirmed; preparing navigation.');
        setButtonState(button, "Saved", true);
        if (getCurrentJobId() === jobId && getJobSurface() === surface) {
          celebrateSheetsSuccess(button);
        }
        // A navigation failure must not make a completed Sheets write look failed.
        try {
          reportNavigation('Confirming external application.');
          confirmExternalApplication(jobId, surface);
          await openNextJobAfterSheets(jobId, reportNavigation);
        } catch (error) {
          reportNavigation(`Navigation error: ${errorMessage(error)}`);
          console.warn('LinkedIn Job Text Copier: could not open the next job.', error);
        }
      } else {
        const errors: Partial<Record<string, [string, string]>> = {
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
        const [label, detail] = errors[response?.code] || errors.SHEETS_CONNECTION_FAILED || ["Check Sheets", "Check the table before retrying."];
        const diagnostics = [response.code, "stage" in response && response.stage,
          "cell" in response && response.cell && `Written cell: ${response.cell}`,
          "nextCell" in response && response.nextCell && `Target: ${response.nextCell}`,
          "selectedCell" in response && response.selectedCell && `Selected: ${response.selectedCell}`,
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
    button.dataset.defaultLabel = "Save to Sheets";
    button.dataset.ljtcRunId = RUN_ID;
    button.textContent = "Save to Sheets";
    button.title = "Save job details and link to the selected cell in your most recently used open Google Sheets tab. Replaces that cell, then selects the next row. Also confirms an available LinkedIn Yes application prompt, then opens the next job.";
    button.dataset.defaultTitle = button.title;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      sendToSheets(button);
    });
    return button;
  }

  function updateDismissJobButton(button: HTMLButtonElement) {
    const nativeButton = getCurrentJobDismissButton();
    const undo = nativeButton && isUndoDismissButton(nativeButton);
    const label = undo ? "Restore job" : "Hide job";
    const title = undo ? "Restore this hidden job using LinkedIn's undo button."
      : "Hide this job from your LinkedIn results using its native dismiss button.";
    if (button.dataset.defaultLabel !== label) button.dataset.defaultLabel = label;
    if (button.textContent !== label) button.textContent = label;
    if (button.title !== title) button.title = title;
    button.classList.toggle("ljtc-copy-button--undo-dismiss", Boolean(undo));
  }

  function createDismissJobButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${BUTTON_CLASS} ljtc-copy-button--dismiss`;
    button.dataset.ljtcAction = DISMISS_ACTION_ID;
    button.dataset.defaultLabel = "Hide job";
    button.dataset.ljtcRunId = RUN_ID;
    button.textContent = "Hide job";
    button.title = "Hide this job from your LinkedIn results using its native dismiss button.";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nativeButton = getCurrentJobDismissButton();
      if (!nativeButton) {
        setButtonState(button, "Cross not found", false);
        return;
      }
      nativeButton.click();
      updateDismissJobButton(button);
    });
    updateDismissJobButton(button);
    return button;
  }

  function removeLegacyHeaderButton() {
    document
      .querySelectorAll<HTMLElement>(`.ljtc-about-row [data-ljtc-action="${DESCRIPTION_ACTION_ID}"]`)
      .forEach((button) => button.remove());

    document.querySelectorAll<HTMLElement>(".ljtc-about-row").forEach((row) => {
      row.replaceWith(...row.childNodes);
    });
  }

  function isCompactTopBar(topButtons: HTMLElement | null | undefined) {
    if (!isVisible(topButtons)) {
      return false;
    }

    if (!topButtons) return false;
    const buttonsRect = topButtons.getBoundingClientRect();
    const surface = getJobSurface();
    const jobId = getCurrentJobId();
    const candidates = new Set([
      document.querySelector<HTMLElement>(".job-details-jobs-unified-top-card__job-title h1"),
      getJobTitleLink(),
      ...Array.from(surface?.querySelectorAll<HTMLElement>([
        "h1",
        '[class*="job-title"]',
        jobId ? `a[href*="/jobs/view/${jobId}"]` : 'a[href*="/jobs/view/"]'
      ].join(", ")) || [])
    ]);

    return Array.from(candidates).some((title) => {
      if (!title || !topButtons || !isVisible(title) || topButtons.contains(title)) {
        return false;
      }

      const titleRect = title.getBoundingClientRect();
      const verticalOverlap = Math.min(titleRect.bottom, buttonsRect.bottom)
        - Math.max(titleRect.top, buttonsRect.top);

      return verticalOverlap > Math.min(titleRect.height, buttonsRect.height) * 0.25;
    });
  }

  function updateDescriptionButtonVisibility(topButtons: HTMLElement | null | undefined) {
    const descriptionButton = topButtons?.querySelector<HTMLElement>(
      `[data-ljtc-action="${DESCRIPTION_ACTION_ID}"]`
    );
    const chatGptButton = topButtons?.querySelector<HTMLElement>(
      `[data-ljtc-action="${CHATGPT_ACTION_ID}"]`
    );
    const hidden = isCompactTopBar(topButtons);

    if (descriptionButton) {
      descriptionButton.hidden = hidden;
    }

    if (chatGptButton) {
      chatGptButton.hidden = hidden;
    }

    const sheetsButton = topButtons?.querySelector<HTMLElement>(`[data-ljtc-action="${SHEETS_ACTION_ID}"]`);
    if (sheetsButton) sheetsButton.hidden = hidden;
  }

  function createSettingsButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${BUTTON_CLASS} ljtc-copy-button--settings`;
    button.dataset.ljtcAction = "ljtc-open-settings";
    button.dataset.ljtcRunId = RUN_ID;
    button.title = "Open extension settings";
    button.setAttribute("aria-label", "Open extension settings");
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        const response = await sendRuntime(openPopup, { type: "LJTC_OPEN_POPUP" });
        button.title = response?.ok ? "Open extension settings"
          : "Could not open settings. Click the extension icon in the browser toolbar.";
      } catch (error) {
        button.title = "Reload this page and try again, or click the extension icon in the browser toolbar.";
      }
    });
    return button;
  }

  function insertTopButton() {
    const topButtons = getTopButtons();
    if (!topButtons) {
      return;
    }

    document
      .querySelectorAll<HTMLElement>(`[data-ljtc-action="${TOP_ACTION_ID}"]`)
      .forEach((button) => {
        if (!topButtons.contains(button)) {
          button.closest<HTMLElement>(".ljtc-top-button-wrapper")?.remove();
          button.remove();
        }
      });

    const existingButton = topButtons.querySelector<HTMLElement>(`[data-ljtc-action="${TOP_ACTION_ID}"]`);
    if (existingButton?.dataset.ljtcRunId === RUN_ID) {
      const dismissButton = topButtons.querySelector<HTMLButtonElement>(`[data-ljtc-action="${DISMISS_ACTION_ID}"]`);
      if (dismissButton) updateDismissJobButton(dismissButton);
      updateJobControls(existingButton.closest<HTMLElement>(".ljtc-top-button-wrapper"));
      updateDescriptionButtonVisibility(topButtons);
      return;
    }

    const existingWrapper = existingButton?.closest<HTMLElement>(".ljtc-top-button-wrapper");
    if (existingWrapper) {
      existingWrapper.remove();
    } else {
      existingButton?.remove();
    }

    const share = topButtons.querySelector<HTMLElement>(SHARE_SELECTOR);
    const descriptionButton = createCopyButton(
      "Copy description",
      DESCRIPTION_BUTTON_CLASS,
      DESCRIPTION_ACTION_ID,
      buildDescriptionClipboardText
    );
    const chatGptButton = createChatGptButton();
    const button = createCopyButton("Copy & mark applied", TOP_BUTTON_CLASS, TOP_ACTION_ID, buildTopClipboardText);
    const wrapper = document.createElement("div");
    wrapper.className = "ljtc-top-button-wrapper";
    const descriptionControls = document.createElement("div");
    descriptionControls.className = "ljtc-description-controls";
    descriptionControls.appendChild(createSettingsButton());
    descriptionControls.appendChild(descriptionButton);
    wrapper.appendChild(descriptionControls);
    wrapper.appendChild(chatGptButton);
    wrapper.appendChild(button);
    wrapper.appendChild(createDismissJobButton());
    wrapper.appendChild(createSheetsButton());
    wrapper.appendChild(createJobControl("ljtc-apply-job", "Apply", "ljtc-copy-button--apply", () => getNativeApplyButton()?.click()));
    const navigation = document.createElement("div");
    navigation.className = "ljtc-job-navigation";
    navigation.appendChild(createJobControl("ljtc-previous-job", "Previous", "ljtc-copy-button--previous", () => navigateJob(-1)));
    navigation.appendChild(createJobControl("ljtc-next-job", "Next", "ljtc-copy-button--next", () => navigateJob(1)));
    wrapper.appendChild(navigation);

    if (share) {
      share.insertAdjacentElement("afterend", wrapper);
    } else if (["job-actions", "sdui-top-actions"].includes(topButtons.dataset.ljtcPlacement || "")) {
      topButtons.appendChild(wrapper);
    } else {
      topButtons.insertBefore(wrapper, topButtons.firstChild);
    }

    updateJobControls(wrapper);
    updateDescriptionButtonVisibility(topButtons);
  }

  function enhanceLinkedInJob() {
    if (!isJobsPage()) {
      return 0;
    }

    ensureStyles();
    removeAppliedJobCards();
    removeLegacyHeaderButton();
    insertTopButton();
    scheduleDismissAppliedModal();

    return document.querySelectorAll<HTMLElement>(`[data-ljtc-run-id="${RUN_ID}"]`).length;
  }

  function isPostApplyModalText(text: string) {
    const hasPostApplyTitle = /Added to your applied jobs/i.test(text)
      || /Your application was sent to\b/i.test(text);
    const hasPostApplyContext = /Next,\s*continue your search/i.test(text)
      || /Applied"?\s+tab of My Jobs/i.test(text)
      || /There are more jobs similar to this one/i.test(text);

    return hasPostApplyTitle && hasPostApplyContext;
  }

  function getAppliedModalRoots() {
    const shadowRoot = document.getElementById("interop-outlet")?.shadowRoot;
    return shadowRoot ? [document, shadowRoot] : [document];
  }

  function getAppliedModalCloseButton(modal: HTMLElement) {
    const closeButton = modal.querySelector<HTMLButtonElement>([
      'button[aria-label="Dismiss"]',
      'button[aria-label="Close"]',
      'button[data-test-modal-close-btn]',
      ".artdeco-modal__dismiss"
    ].join(", "));

    if (closeButton) {
      return closeButton;
    }

    return Array.from(modal.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => /^Not now$/i.test(getVisibleText(button)));
  }

  function dismissAppliedModal() {
    if (!autoDismissAppliedModal || !isJobsPage()) {
      return 0;
    }

    const selector = [
      "dialog",
      '[role="dialog"]',
      '[aria-modal="true"]',
      ".artdeco-modal",
      ".artdeco-modal-overlay"
    ].join(", ");
    const modals = getAppliedModalRoots().flatMap((root) => Array.from(root.querySelectorAll<HTMLElement>(selector)));
    const clickedButtons = new Set<HTMLButtonElement>();
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

      if (closeButton && !closeButton.disabled
        && closeButton.getAttribute("aria-disabled") !== "true"
        && isVisible(closeButton) && !clickedButtons.has(closeButton)) {
        clickedButtons.add(closeButton);
        closeButton.click();
        dismissedCount += 1;
      }
    });

    return dismissedCount;
  }

  function scheduleDismissAppliedModal(_delay = 0) {
    // MutationObserver runs before rendering; a timer lets the confirmation flash.
    dismissAppliedModal();
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
        .querySelectorAll<HTMLElement>(`[data-ljtc-action="${DESCRIPTION_ACTION_ID}"]`)
        .forEach((button) => {
          updateDescriptionButtonVisibility(button.closest<HTMLElement>(".ljtc-top-button-wrapper")?.parentElement);
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
        window.clearInterval(retryTimer ?? undefined);
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

  function patchHistoryMethod(methodName: "pushState" | "replaceState") {
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
      const settings: unknown = await storage.get({
        [AUTO_DISMISS_APPLIED_MODAL_KEY]: false,
        [HIDE_APPLIED_JOBS_KEY]: true
      });

      applySettings(settings);
    } catch (error) {
      autoDismissAppliedModal = false;
    }
  }

  function applySettings(settings: unknown) {
    if (!isRecord(settings)) return;
    const validated = readSettings(settings);
    if (Object.hasOwn(settings, AUTO_DISMISS_APPLIED_MODAL_KEY)) {
      autoDismissAppliedModal = validated.autoDismissAppliedModal;
      scheduleDismissAppliedModal(0);
    }
    if (Object.hasOwn(settings, HIDE_APPLIED_JOBS_KEY)) {
      hideAppliedJobs = validated.hideAppliedJobs;
      startRetryWindow();
    }
  }

  function watchSettings() {
    chrome.storage?.onChanged?.addListener((changes, areaName) => {
      const storageArea = chrome.storage?.sync ? "sync" : "local";
      if (areaName !== storageArea) return;
      const settings: Record<string, unknown> = {};
      for (const key of [AUTO_DISMISS_APPLIED_MODAL_KEY, HIDE_APPLIED_JOBS_KEY]) {
        if (changes[key]) settings[key] = changes[key].newValue;
      }
      applySettings(settings);
    });
  }

  window.addEventListener("popstate", handleUrlChange);
  window.addEventListener("scroll", scheduleViewportUpdate, true);
  window.addEventListener("resize", scheduleViewportUpdate);
  listen(settingsUpdated, (message, _sender, sendResponse) => {
    applySettings(message.settings);
    sendResponse({ ok: true });
    return false;
  });
  listen(refreshButtonsMessage, (_message, _sender, sendResponse) => {
    startRetryWindow();
    window.setTimeout(() => sendResponse({
      isJobsPage: isJobsPage(), buttonCount: enhanceLinkedInJob()
    }), 50);
    return true;
  });

  const observer = new MutationObserver((mutations) => {
    if (isJobsPage()) {
      observeAppliedModalRoots();
      if (mutations.some((mutation) => mutation.type !== "attributes" || ["aria-label", "disabled"].includes(mutation.attributeName || ""))) {
        scheduleEnhance();
      }
      scheduleDismissAppliedModal();
    }
  });
  const observedAppliedModalRoots = new WeakSet();

  function observeAppliedModalRoots() {
    let addedRoot = false;
    getAppliedModalRoots().forEach((root) => {
      if (observedAppliedModalRoots.has(root)) return;

      observer.observe("documentElement" in root ? root.documentElement : root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["open", "aria-hidden", "class", "style", "aria-label", "disabled"]
      });
      observedAppliedModalRoots.add(root);
      addedRoot = true;
    });
    if (addedRoot) scheduleDismissAppliedModal();
  }

  observeAppliedModalRoots();
  window.setInterval(() => {
    handleUrlChange();
    // Attaching a shadow root itself does not produce a document mutation.
    observeAppliedModalRoots();
  }, 1000);
  watchSettings();

  loadSettings().finally(() => {
    startRetryWindow();
    scheduleDismissAppliedModal(0);
  });
})();
