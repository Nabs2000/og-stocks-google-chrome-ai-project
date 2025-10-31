async function loadSummary() {
  const storage = await chrome.storage.local.get(["lastSummary", "lastSelection"]);
  const output = document.getElementById("summaryOutput");

  if (storage.lastSummary) {
    output.innerText = storage.lastSummary;
    return;
  }

  // If we don't have a cached summary but we do have a recent selection,
  // request the background summarizer to generate one and persist it.
  if (storage.lastSelection) {
    output.innerText = "Summarizing your selection...";
    try {
      const response = await chrome.runtime.sendMessage({
        type: "TEXT_SELECTED",
        text: storage.lastSelection
      });

      const summaryText = response?.summary || "Browser does not support built-in summarizer.";
      output.innerText = summaryText;

      // Save the summary so subsequent opens show it instantly
      try {
        await chrome.storage.local.set({ lastSummary: summaryText });
      } catch (e) {
        console.warn('Could not save lastSummary:', e);
      }

      // Optionally remove the lastSelection now that it has been summarized
      try {
        await chrome.storage.local.remove('lastSelection');
      } catch (e) {
        /* ignore */
      }
    } catch (err) {
      console.error('Error requesting summarization:', err);
      output.innerText = "Something went wrong while summarizing.";
    }
    return;
  }

  output.innerText = "No summary yet.";
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadSummary();

  const copyBtn = document.getElementById("copyBtn");
  const copiedText = document.getElementById("copiedText");

  copyBtn.addEventListener("click", async () => {
    const text = document.getElementById("summaryOutput").innerText;
    await navigator.clipboard.writeText(text);

    copiedText.classList.remove("hidden");
    setTimeout(() => copiedText.classList.add("hidden"), 1500);
  });
});
