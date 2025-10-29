async function summarizeText(text) {
  document.getElementById("summaryOutput").textContent = "Summarizing...";
  const spinner = document.getElementById("loadingSpinner");
  spinner.classList.remove("hidden");
  document.getElementById("summaryOutput").innerText = "";

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

      const oldMsg = document.getElementById("copyMessage");
      if (oldMsg) oldMsg.remove();

      const msg = document.createElement("div");
      msg.id = "copyMessage";
      msg.textContent = "Copied!";
      msg.style.color = "#34A853";
      msg.style.fontSize = "13px";
      msg.style.marginTop = "10px";
      msg.style.transition = "opacity 0.3s ease";
      msg.style.opacity = "1";

      const buttonsContainer = document.getElementById("buttonsContainer") || summaryOutput.parentElement;
      buttonsContainer.appendChild(msg);

      setTimeout(() => {
        msg.style.opacity = "0";
        setTimeout(() => msg.remove(), 300);
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

  const { lastSelection } = await chrome.storage.local.get("lastSelection");

  if (lastSelection) {

    document.getElementById("summaryOutput").textContent =
      "Summarizing your last selection...";
    await summarizeText(lastSelection);

    await chrome.storage.local.remove("lastSelection");
  }
});
