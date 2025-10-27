chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "SHOW_SUMMARY") {
    showSummary(message.summary);
  }
});

let lastSent = "";         // to avoid re-sending the same text repeatedly
let summaryEl = null;      // reuse a single floating box
let hideTimer = null;

document.addEventListener("mouseup", () => {
  const text = (window.getSelection()?.toString() || "").trim();
  if (!text) return;

  // Avoid spamming background with identical selection
  if (text === lastSent) return;
  lastSent = text;

  // Tell background to summarize
  chrome.runtime.sendMessage({ type: "TEXT_SELECTED", text });
});

function showSummary(summary) {
  if (!summaryEl) {
    summaryEl = document.createElement("div");
    summaryEl.id = "quick-summarizer-bubble";
    Object.assign(summaryEl.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      background: "white",
      color: "#111",
      padding: "10px 12px",
      border: "1px solid #ccc",
      borderRadius: "8px",
      zIndex: 2147483647, // max-ish
      maxWidth: "360px",
      boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
      fontFamily: "system-ui, sans-serif",
      whiteSpace: "pre-wrap",
      lineHeight: "1.35",
    });

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    Object.assign(closeBtn.style, {
      position: "absolute",
      top: "4px",
      right: "6px",
      border: "none",
      background: "transparent",
      fontSize: "16px",
      cursor: "pointer",
    });
    closeBtn.addEventListener("click", () => {
      summaryEl.remove();
      summaryEl = null;
    });
    summaryEl.appendChild(closeBtn);

    const content = document.createElement("div");
    content.id = "quick-summarizer-content";
    summaryEl.appendChild(content);

    document.body.appendChild(summaryEl);
  }

  // Update content
  const content = summaryEl.querySelector("#quick-summarizer-content");
  content.textContent = summary || "Summary not available.";

  // Auto-hide after 20s (optional)
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (summaryEl) {
      summaryEl.remove();
      summaryEl = null;
    }
  }, 20000);
}