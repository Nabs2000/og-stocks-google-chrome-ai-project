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

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "TEXT_SELECTED") {
      try {
        const summary = await summarizeBuiltIn(message.text);
        sendResponse({ ok: true, summary });
      } catch (e) {
        console.error("Error occured:", e);
        sendResponse({ ok: false, summary: "Built-In Summarizer not supported" });
      }
    }
  })();

  // IMPORTANT: keep the message channel open for async sendResponse's
  return true;
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "OPEN_SUMMARY_POPUP") {
    // Try to open the popup programmatically
    chrome.action.openPopup().catch((err) => {
      console.warn("Could not open popup automatically:", err);
    });
  }
});
