import { sendTab, refreshButtonsMessage, settingsUpdated, readSettings, type Settings } from "./contracts";
const REFRESH_MESSAGE = "LJTC_REFRESH_BUTTONS";
const SETTINGS_UPDATED_MESSAGE = "LJTC_SETTINGS_UPDATED";
const HIDE_APPLIED_JOBS_KEY = "hideAppliedJobs";
const hideAppliedJobs = document.querySelector<HTMLInputElement>("#hideAppliedJobs");
const AUTO_DISMISS_APPLIED_MODAL_KEY = "autoDismissAppliedModal";

const refreshButton = document.querySelector<HTMLButtonElement>("#refreshButton");
const autoDismissAppliedModal = document.querySelector<HTMLInputElement>("#autoDismissAppliedModal");
const statusText = document.querySelector("#status");

function setStatus(text: string) {
  if (statusText) statusText.textContent = text;
}

function getStorageArea() {
  return chrome.storage?.sync || chrome.storage?.local || null;
}

function setStorageUnavailableStatus() {
  setStatus("Reload the extension to enable this setting.");
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return tab;
}

function isLinkedInJobsTab(tab: chrome.tabs.Tab) {
  try {
    const url = new URL(tab.url || "");
    return url.hostname === "www.linkedin.com" && /^\/jobs(?:\/|$)/.test(url.pathname);
  } catch (error) {
    return false;
  }
}

async function sendRefreshMessage(tabId: number) {
  return sendTab(refreshButtonsMessage, tabId, {
    type: REFRESH_MESSAGE
  });
}

async function sendSettingsMessage(tabId: number, settings: Partial<Settings>) {
  return sendTab(settingsUpdated, tabId, {
    type: SETTINGS_UPDATED_MESSAGE,
    settings
  });
}

async function reloadTab(tabId: number) {
  await chrome.tabs.reload(tabId, {
    bypassCache: true
  });
}

async function refreshButtons() {
  if (!refreshButton) return;
  refreshButton.disabled = true;
  setStatus("Refreshing...");

  try {
    const tab = await getActiveTab();

    if (!tab?.id || !isLinkedInJobsTab(tab)) {
      setStatus("Open a LinkedIn Jobs page first.");
      return;
    }

    try {
      const response = await sendRefreshMessage(tab.id);

      if (response?.buttonCount > 0) {
        setStatus("Buttons refreshed.");
        return;
      }
    } catch (error) {
      // The content script is missing or stale. Reloading the tab gives Chrome a fresh injection point.
    }

    setStatus("Reloading LinkedIn tab...");
    await reloadTab(tab.id);
  } catch (error) {
    setStatus("Could not refresh this tab.");
  } finally {
    refreshButton.disabled = false;
  }
}

async function loadSettings() {
  if (!autoDismissAppliedModal || !hideAppliedJobs) return;
  const storage = getStorageArea();

  if (!storage) {
    autoDismissAppliedModal.disabled = true;
    hideAppliedJobs.disabled = true;
    setStorageUnavailableStatus();
    return;
  }

  try {
    const stored: unknown = await storage.get({
      [AUTO_DISMISS_APPLIED_MODAL_KEY]: false,
      [HIDE_APPLIED_JOBS_KEY]: true
    });

    const settings = readSettings(stored);
    autoDismissAppliedModal.checked = settings.autoDismissAppliedModal;
    hideAppliedJobs.checked = settings.hideAppliedJobs;
  } catch (error) {
    autoDismissAppliedModal.disabled = true;
    hideAppliedJobs.disabled = true;
    setStorageUnavailableStatus();
  }
}

async function saveSetting(input: HTMLInputElement, key: keyof Settings, label: string) {
  const enabled = input.checked;
  const storage = getStorageArea();

  if (!storage) {
    input.checked = !enabled;
    setStorageUnavailableStatus();
    return;
  }

  input.disabled = true;
  setStatus(`${label} ${enabled ? "enabled" : "disabled"}.`);

  try {
    await storage.set({
      [key]: enabled
    });

    const tab = await getActiveTab();

    if (tab?.id && isLinkedInJobsTab(tab)) {
      try {
        await sendSettingsMessage(tab.id, {
          [key]: enabled
        });
      } catch (error) {
        // The content script will pick this up after the next page load.
      }
    }
  } catch (error) {
    input.checked = !enabled;
    setStatus("Could not save this setting. Reload the extension.");
  } finally {
    input.disabled = false;
  }
}

refreshButton?.addEventListener("click", refreshButtons);
autoDismissAppliedModal?.addEventListener("change", () => autoDismissAppliedModal && saveSetting(autoDismissAppliedModal, AUTO_DISMISS_APPLIED_MODAL_KEY, "Auto-close"));
hideAppliedJobs?.addEventListener("change", () => hideAppliedJobs && saveSetting(hideAppliedJobs, HIDE_APPLIED_JOBS_KEY, "Hide Applied jobs"));
loadSettings();
