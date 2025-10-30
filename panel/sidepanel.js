async function summarizeText(text) {
  document.getElementById("summaryOutput").textContent = "Summarizing...";

  const copyBtn = document.getElementById("copyBtn");
  const copyFeedback = document.getElementById("copiedText");
  if (copyBtn) copyBtn.classList.add("hidden");
  if (copyFeedback) copyFeedback.classList.add("hidden");
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: "TEXT_SELECTED",
      text
    });

    const summaryOutput = document.getElementById("summaryOutput");
    const summary = response?.summary || "Browser does not support built-in summarizer.";
    
    summaryOutput.textContent = summary;

    if (response?.summary && copyBtn) {
        copyBtn.classList.remove("hidden");
    }

    copyBtn.onclick = async () => {
      const summaryText = summaryOutput.innerText.trim();
      if (!summaryText) return;

      await navigator.clipboard.writeText(summaryText);

      if (copyFeedback) {
          copyFeedback.classList.remove("hidden");
          setTimeout(() => {
              copyFeedback.classList.add("hidden");
          }, 3000);
      }
    };

  } catch (err) {
    console.error(err);
    document.getElementById("summaryOutput").textContent =
      "Something went wrong. Check the console.";
  }
}

document.addEventListener("DOMContentLoaded", async () => {

  const { lastSelection } = await chrome.storage.local.get("lastSelection");

  if (lastSelection) {
    
    document.getElementById("summaryOutput").textContent =
      "Summarizing...";
      
    await summarizeText(lastSelection);

    await chrome.storage.local.remove("lastSelection");
  } else {
     document.getElementById("summaryOutput").textContent =
      "No text was highlighted when the button was pressed. Highlight text and click the Summarize button to begin.";
  }
});