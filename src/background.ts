import { listen, openPopup, sendSheets, sendChatGpt, fillSheets, fillChatGpt, sendTab, errorMessage, type SheetsResult, type ChatGptResult } from "./contracts";
const SEND_TO_CHATGPT_MESSAGE = "LJTC_SEND_TO_CHATGPT";
const FILL_CHATGPT_MESSAGE = "LJTC_FILL_CHATGPT";
const CHATGPT_URLS = [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*"
];

function pickMostRecentTab(tabs: chrome.tabs.Tab[]): (chrome.tabs.Tab & { id: number }) | undefined {
  return tabs
    .filter((tab): tab is chrome.tabs.Tab & { id: number } => typeof tab.id === "number" && Number.isInteger(tab.id))
    .sort((left, right) => (right.lastAccessed || 0) - (left.lastAccessed || 0))[0];
}

let sheetsTransferPending = false;

listen(openPopup, (message, sender, sendResponse) => {
  if (message?.type !== "LJTC_OPEN_POPUP") return false;
  if (!sender.tab?.url?.startsWith("https://www.linkedin.com/")) {
    sendResponse({ ok: false, code: "INVALID_SENDER" });
    return false;
  }
  if (typeof chrome.action?.openPopup !== "function") {
    sendResponse({ ok: false, code: "POPUP_OPEN_FAILED" });
    return false;
  }
  chrome.action.openPopup({ windowId: sender.tab.windowId }).then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false, code: "POPUP_OPEN_FAILED" })
  );
  return true;
});

async function sendJobToSheets(text: string, sourceTab?: chrome.tabs.Tab): Promise<SheetsResult> {
  if (sheetsTransferPending) return { ok: false, code: "SHEETS_BUSY" };
  sheetsTransferPending = true;
  try {
    const tabs = await chrome.tabs.query({ url: "https://docs.google.com/spreadsheets/d/*" });
    const tab = pickMostRecentTab(tabs);
    if (!tab) return { ok: false, code: "SHEETS_NOT_OPEN" };

    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    const message = { type: "LJTC_FILL_SHEETS", text } as const;
    let response;
    try {
      response = await sendTab(fillSheets, tab.id, message);
    } catch (error) {
      // A lost response may follow a successful write. Recover only a missing receiver.
      if (!errorMessage(error).includes("Receiving end does not exist")) {
        return { ok: false, code: "SHEETS_CONNECTION_FAILED" };
      }
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["sheets.js"] });
      } catch (error) {
        return { ok: false, code: "SHEETS_SCRIPT_UNAVAILABLE" };
      }
      response = await sendTab(fillSheets, tab.id, message);
    }

    if (response?.ok && sourceTab?.id) {
      // Keep the next cell selected in Sheets, then return to the vacancy.
      try {
        await chrome.tabs.update(sourceTab.id, { active: true });
        await chrome.windows.update(sourceTab.windowId, { focused: true });
      } catch (error) {
        // Losing the source tab does not undo the completed paste.
      }
    }
    return response || { ok: false, code: "SHEETS_CONNECTION_FAILED" };
  } catch (error) {
    return { ok: false, code: "SHEETS_CONNECTION_FAILED" };
  } finally {
    sheetsTransferPending = false;
  }
}

listen(sendSheets, (message, sender, sendResponse) => {
  if (message?.type !== "LJTC_SEND_TO_SHEETS") return false;
  if (!sender.tab?.url?.startsWith("https://www.linkedin.com/")) {
    sendResponse({ ok: false, code: "INVALID_SENDER" });
    return false;
  }
  const text = typeof message.text === "string" ? message.text.trim() : "";
  if (!text) {
    sendResponse({ ok: false, code: "NO_TEXT" });
    return false;
  }
  sendJobToSheets(text, sender.tab).then(sendResponse);
  return true;
});

async function sendJobToChatGpt(text: string): Promise<ChatGptResult> {
  const tabs = await chrome.tabs.query({
    url: CHATGPT_URLS
  });
  const tab = pickMostRecentTab(tabs);

  if (!tab?.id) {
    return {
      ok: false,
      code: "CHATGPT_NOT_OPEN"
    };
  }

  const targetTab = tab;
  const message = { type: FILL_CHATGPT_MESSAGE, text } as const;
  async function deliver(): Promise<ChatGptResult> {
    const response = await sendTab(fillChatGpt, targetTab.id, message);
    return {
      ...(response || { ok: false, code: "CHATGPT_NOT_READY" }),
      tabUrl: targetTab.url
    };
  }

  try {
    return await deliver();
  } catch (error) {
    // Only retry when Chrome confirms there was no recipient. A closed message
    // channel can mean the first submission already ran; retrying could send twice.
    if (!errorMessage(error).includes("Receiving end does not exist")) {
      return { ok: false, code: "CHATGPT_CONNECTION_FAILED" };
    }
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["chatgpt.js"]
    });
  } catch (error) {
    return { ok: false, code: "CHATGPT_SCRIPT_UNAVAILABLE" };
  }

  try {
    return await deliver();
  } catch (error) {
    return {
      ok: false,
      code: "CHATGPT_CONNECTION_FAILED"
    };
  }
}

listen(sendChatGpt, (message, sender, sendResponse) => {
  if (message?.type !== SEND_TO_CHATGPT_MESSAGE) {
    return false;
  }

  if (sender.tab?.url && !sender.tab.url.startsWith("https://www.linkedin.com/")) {
    sendResponse({
      ok: false,
      code: "INVALID_SENDER"
    });
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

  sendJobToChatGpt(text)
    .then(sendResponse)
    .catch(() => sendResponse({
      ok: false,
      code: "CHATGPT_CONNECTION_FAILED"
    }));

  return true;
});
