async function summarizeText(text) {
  document.getElementById("summaryOutput").textContent = "Summarizing...";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "TEXT_SELECTED",
      text
    });

    document.getElementById("summaryOutput").textContent =
      response?.summary || "Summary not available.";

    const summaryOutput = document.getElementById("summaryOutput");
    const actionsDiv = document.getElementById("summaryActions");

    actionsDiv.classList.remove("hidden");

    document.getElementById("copyBtn").onclick = () => {
      navigator.clipboard.writeText(summaryOutput.innerText);
      alert("Summary copied to clipboard!");
    };

    document.getElementById("saveBtn").onclick = async () => {
      const savedSummaries = (await chrome.storage.local.get("summaries")).summaries || [];
      savedSummaries.unshift({
        text,
        summary: summaryOutput.innerText,
        timestamp: new Date().toLocaleString(),
      });
      await chrome.storage.local.set({ summaries: savedSummaries.slice(0, 10) }); // keep last 10
      alert("Summary saved!");
    };

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
