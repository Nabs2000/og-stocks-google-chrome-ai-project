document.getElementById("summarizeBtn").addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject a tiny function to grab current selection
    const [{ result: selectedText }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || ""
    });

    const text = (selectedText || "").trim();
    if (!text) {
      document.getElementById("summaryOutput").innerText =
        "No text selected. Please highlight some text on the page.";
      return;
    }

    // Ask background to summarize (it holds the API call)
    const response = await chrome.runtime.sendMessage({
      type: "TEXT_SELECTED",
      text
    });

    document.getElementById("summaryOutput").innerText =
      response?.summary || "Summary not available.";
  } catch (err) {
    console.error(err);
    document.getElementById("summaryOutput").innerText =
      "Something went wrong. Check the console.";
  }
});