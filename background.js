const SEND_TO_CHATGPT_MESSAGE = "LJTC_SEND_TO_CHATGPT";
const FILL_CHATGPT_MESSAGE = "LJTC_FILL_CHATGPT";
const CHATGPT_URLS = [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*"
];

function pickMostRecentTab(tabs) {
  return tabs
    .filter((tab) => Number.isInteger(tab.id))
    .sort((left, right) => (right.lastAccessed || 0) - (left.lastAccessed || 0))[0];
}

async function sendJobToChatGpt(text) {
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

  const message = { type: FILL_CHATGPT_MESSAGE, text };
  async function deliver() {
    const response = await chrome.tabs.sendMessage(tab.id, message, { frameId: 0 });
    return {
      ...(response || { ok: false, code: "CHATGPT_NOT_READY" }),
      tabUrl: tab.url
    };
  }

  try {
    return await deliver();
  } catch (error) {
    // Only retry when Chrome confirms there was no recipient. A closed message
    // channel can mean the first submission already ran; retrying could send twice.
    if (!error.message?.includes("Receiving end does not exist")) {
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
