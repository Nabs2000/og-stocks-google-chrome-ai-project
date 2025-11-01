const MAX_HISTORY_ITEMS = 10;

async function renderHistory() {
  const { summaryHistory = [] } = await chrome.storage.local.get(
    "summaryHistory"
  );
  const container = document.getElementById("historyContainer");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");

  container.innerHTML = "";

  if (summaryHistory.length === 0) {
    container.textContent = "No history yet.";
    clearHistoryBtn.classList.add("hidden");
  } else {
    clearHistoryBtn.classList.remove("hidden");
    summaryHistory.forEach((item) => {
      const historyElement = document.createElement("details");
      historyElement.className = "history-item";

      const summary = document.createElement("summary");

      summary.textContent = item.originalText;

      const content = document.createElement("div");
      content.textContent = item.summary;

      historyElement.appendChild(summary);
      historyElement.appendChild(content);
      container.appendChild(historyElement);
    });
  }
}

async function summarizeText(text) {
  const summaryOutput = document.getElementById("summaryOutput");
  summaryOutput.textContent = "Summarizing...";

  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyFeedback = document.getElementById("copiedText");

  if (copyBtn) copyBtn.classList.add("hidden");
  if (clearBtn) clearBtn.classList.add("hidden");
  if (copyFeedback) copyFeedback.classList.add("hidden");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "TEXT_SELECTED",
      text,
    });

    const summary =
      response?.summary || "Browser does not support built-in summarizer.";
    const summaryTitle =
      response?.summaryTitle || "Browser does not support built-in summarizer.";
    summaryOutput.textContent = summary;

    if (response?.summary) {
      copyBtn.classList.remove("hidden");
      clearBtn.classList.remove("hidden");

      const { summaryHistory = [] } = await chrome.storage.local.get(
        "summaryHistory"
      );
      const newItem = {
        id: Date.now(),
        summary: summary,
        originalText: summaryTitle,
      };

      const newHistory = [newItem, ...summaryHistory].slice(
        0,
        MAX_HISTORY_ITEMS
      );

      await chrome.storage.local.set({ summaryHistory: newHistory });
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
    summaryOutput.textContent = "Something went wrong. Check the console.";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const summaryOutput = document.getElementById("summaryOutput");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");

  clearBtn.addEventListener("click", () => {
    summaryOutput.textContent =
      "Highlight text on the page and click 'Summarize' to begin.";
    copyBtn.classList.add("hidden");
    clearBtn.classList.add("hidden");
  });

  clearHistoryBtn.addEventListener("click", async () => {
    await chrome.storage.local.set({ summaryHistory: [] });
  });

  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace !== "local") return;

    if (changes.lastSelection?.newValue) {
      const newText = changes.lastSelection.newValue;
      await summarizeText(newText);
      await chrome.storage.local.remove("lastSelection");
    }

    if (changes.summaryHistory) {
      await renderHistory();
    }
  });

  await renderHistory();

  const { lastSelection } = await chrome.storage.local.get("lastSelection");
  if (lastSelection) {
    await summarizeText(lastSelection);
    await chrome.storage.local.remove("lastSelection");
  } else if (summaryOutput.textContent === "No summary yet.") {
    summaryOutput.textContent =
      "Highlight text on the page and click 'Summarize' to begin.";
  }
});
