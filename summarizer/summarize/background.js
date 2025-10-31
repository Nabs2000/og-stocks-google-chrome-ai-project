async function summarizeBuiltIn(text) {
  // Check availability
  const avail = await Summarizer.availability();
  if (avail === "unavailable") {
    throw new Error("Summarizer API not available on this browser");
  }

  // Create the summarizer (choose options)
  const summarizer = await Summarizer.create({
    type: "key-points",
    format: "markdown",
    length: "short"
  });

  // Perform summarization
  const summary = await summarizer.summarize(text /*, optional: { context: "..." } */);

  return summary;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  if (message?.type === "TEXT_SELECTED") {
    (async () => {
      try {
        const summary = await summarizeBuiltIn(message.text);
        sendResponse({ ok: true, summary });
      } catch (e) {
        console.error("Error occurred:", e);
        sendResponse({ ok: false, summary: "Built-In Summarizer not supported" });
      }
    })();

    // IMPORTANT: keep the message channel open for async sendResponse's
    return true;
  }

  if (message?.type === "OPEN_SUMMARY_POPUP") {
    chrome.action.openPopup().catch((err) => {
      console.warn("Could not open popup automatically:", err);
    });
    // This is synchronous, no 'return true' needed
  }

  if (message?.type === "OPEN_SUMMARY_SIDEPANEL") {
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    } else {
      console.warn("Could not open side panel, sender.tab.id is missing.");
    }
    // This is synchronous, no 'return true' needed
  }

  // If none of the 'if' blocks matched, we don't need to do anything.
});
