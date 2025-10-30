async function summarizeText(text) {
  document.getElementById("summaryOutput").textContent = "Summarizing...";

  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyFeedback = document.getElementById("copiedText");

  if (copyBtn) copyBtn.classList.add("hidden");
  if (clearBtn) clearBtn.classList.add("hidden");
  if (copyFeedback) copyFeedback.classList.add("hidden");
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: "TEXT_SELECTED",
      text
    });

    const summaryOutput = document.getElementById("summaryOutput");
    const summary = response?.summary || "Browser does not support built-in summarizer.";
    
    summaryOutput.textContent = summary;

    if (response?.summary && copyBtn && clearBtn) {
        copyBtn.classList.remove("hidden");
        clearBtn.classList.remove("hidden");
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
  const summaryOutput = document.getElementById("summaryOutput");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyFeedback = document.getElementById("copiedText");

  clearBtn.addEventListener("click", () => {
    summaryOutput.textContent =
      "Highlight text on the page and click 'Summarize' to begin.";
    copyBtn.classList.add("hidden");
    clearBtn.classList.add("hidden");
    copyFeedback.classList.add("hidden");
  });

  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && changes.lastSelection?.newValue) {
      const newText = changes.lastSelection.newValue;

      await summarizeText(newText);

      await chrome.storage.local.remove("lastSelection");
    }
  });

  const { lastSelection } = await chrome.storage.local.get("lastSelection");

  if (lastSelection) {
    await summarizeText(lastSelection);
    await chrome.storage.local.remove("lastSelection");
  } else {
     summaryOutput.textContent =
      "Highlight text on the page and click 'Summarize' to begin.";
     copyBtn.classList.add("hidden");
     clearBtn.classList.add("hidden");
  }
});