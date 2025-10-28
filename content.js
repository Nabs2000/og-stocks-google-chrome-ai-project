let summarizeBtn = null;

document.addEventListener("mouseup", (e) => {
  const text = (window.getSelection()?.toString() || "").trim();

  // Remove old button if any
  if (summarizeBtn) {
    summarizeBtn.remove();
    summarizeBtn = null;
  }

  // Only show button if text is selected
  if (!text) return;

  // Create floating button
  summarizeBtn = document.createElement("button");
  summarizeBtn.textContent = "Summarize";
  Object.assign(summarizeBtn.style, {
    position: "absolute",
    top: `${e.pageY + 10}px`,
    left: `${e.pageX + 10}px`,
    background: "#1a73e8",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "12px",
    cursor: "pointer",
    zIndex: 999999,
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
  });

  // Prevent click from retriggering the document's mouseup
  summarizeBtn.addEventListener("mousedown", (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
  });
  summarizeBtn.addEventListener("mouseup", (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
  });

  // Handle click (now it won’t re-trigger mouseup)
  summarizeBtn.addEventListener("click", async (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    const selectedText = (window.getSelection()?.toString() || "").trim();
    if (!selectedText) return;

    // Save the selected text in local storage so popup can access it
    await chrome.storage.local.set({ lastSelection: selectedText });

    // Ask background script to open the popup
    chrome.runtime.sendMessage({ type: "OPEN_SUMMARY_POPUP" });

    // Optionally remove the button after clicking
    summarizeBtn.remove();
    summarizeBtn = null;
  });

  document.body.appendChild(summarizeBtn);
});
