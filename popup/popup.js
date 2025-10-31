async function summarizeText(text) {
  document.getElementById("summaryOutput").textContent = "Summarizing...";
  const spinner = document.getElementById("loadingSpinner");
  spinner.classList.remove("hidden");

  document.getElementById("summaryOutput").classList.remove("hidden");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "TEXT_SELECTED",
      text
    });

    document.getElementById("summaryOutput").textContent =
      response?.summary || "Browser does not support built-in summarizer.";

    spinner.classList.add("hidden");

    const summaryOutput = document.getElementById("summaryOutput");
    const actionsDiv = document.getElementById("summaryActions");

    actionsDiv.classList.remove("hidden");

    const copyFeedback = document.getElementById("copyFeedback");

    document.getElementById("copyBtn").onclick = async () => {
      const summaryText = summaryOutput.innerText.trim();
      if (!summaryText) return;

      await navigator.clipboard.writeText(summaryText);

      copyFeedback.classList.remove("hidden");

      setTimeout(() => {
        copyFeedback.classList.add("hidden");
      }, 3000); 
    };

  } catch (err) {
    console.error(err);
    document.getElementById("summaryOutput").textContent =
      "Something went wrong. Check the console.";
  }
  spinner.classList.add("hidden");
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

  document.getElementById("summaryOutput").textContent = ""; 
  document.getElementById("summaryOutput").classList.add("hidden");
});
