async function summarizeText(text) {
  document.getElementById("summaryOutput").textContent = "Summarizing...";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "TEXT_SELECTED",
      text
    });

    document.getElementById("summaryOutput").textContent =
      response?.summary || "Summary not available.";
  } catch (err) {
    console.error(err);
    document.getElementById("summaryOutput").textContent =
      "Something went wrong. Check the console.";
  }
}

async function handleSummarizeClick() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

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

  await summarizeText(text);
}

document.addEventListener("DOMContentLoaded", async () => {

  document
    .getElementById("summarizeBtn")
    .addEventListener("click", handleSummarizeClick);

  const { lastSelection } = await chrome.storage.local.get("lastSelection");

  if (lastSelection) {

    document.getElementById("summaryOutput").textContent =
      "Summarizing your last selection...";
    await summarizeText(lastSelection);

    await chrome.storage.local.remove("lastSelection");
  }
});
