const REFRESH_MESSAGE = "LJTC_REFRESH_BUTTONS";
const SETTINGS_UPDATED_MESSAGE = "LJTC_SETTINGS_UPDATED";
const AUTO_DISMISS_APPLIED_MODAL_KEY = "autoDismissAppliedModal";

const refreshButton = document.querySelector("#refreshButton");
const autoDismissAppliedModal = document.querySelector("#autoDismissAppliedModal");
const statusText = document.querySelector("#status");

function setStatus(text) {
  statusText.textContent = text;
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

function isLinkedInJobsTab(tab) {
  try {
    const url = new URL(tab.url);
    return url.hostname === "www.linkedin.com" && /^\/jobs(?:\/|$)/.test(url.pathname);
  } catch (error) {
    return false;
  }
}

async function sendRefreshMessage(tabId) {
  return chrome.tabs.sendMessage(tabId, {
    type: REFRESH_MESSAGE
  });
}

async function sendSettingsMessage(tabId, settings) {
  return chrome.tabs.sendMessage(tabId, {
    type: SETTINGS_UPDATED_MESSAGE,
    settings
  });
}

async function reloadTab(tabId) {
  await chrome.tabs.reload(tabId, {
    bypassCache: true
  });
}

async function refreshButtons() {
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
  const storage = getStorageArea();

  if (!storage) {
    autoDismissAppliedModal.disabled = true;
    setStorageUnavailableStatus();
    return;
  }

  try {
    const settings = await storage.get({
      [AUTO_DISMISS_APPLIED_MODAL_KEY]: false
    });

    autoDismissAppliedModal.checked = Boolean(settings[AUTO_DISMISS_APPLIED_MODAL_KEY]);
  } catch (error) {
    autoDismissAppliedModal.disabled = true;
    setStorageUnavailableStatus();
  }
}

async function saveAutoDismissSetting() {
  const enabled = autoDismissAppliedModal.checked;
  const storage = getStorageArea();

  if (!storage) {
    autoDismissAppliedModal.checked = !enabled;
    setStorageUnavailableStatus();
    return;
  }

  autoDismissAppliedModal.disabled = true;
  setStatus(enabled ? "Auto-close enabled." : "Auto-close disabled.");

  try {
    await storage.set({
      [AUTO_DISMISS_APPLIED_MODAL_KEY]: enabled
    });

    const tab = await getActiveTab();

    if (tab?.id && isLinkedInJobsTab(tab)) {
      try {
        await sendSettingsMessage(tab.id, {
          [AUTO_DISMISS_APPLIED_MODAL_KEY]: enabled
        });
      } catch (error) {
        // The content script will pick this up after the next page load.
      }
    }
  } catch (error) {
    autoDismissAppliedModal.checked = !enabled;
    setStatus("Could not save this setting. Reload the extension.");
  } finally {
    autoDismissAppliedModal.disabled = false;
  }
}

refreshButton.addEventListener("click", refreshButtons);
autoDismissAppliedModal.addEventListener("change", saveAutoDismissSetting);
loadSettings();
