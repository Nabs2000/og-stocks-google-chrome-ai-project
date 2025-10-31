let popupContainer = null;
let statusPanel = null;

function showStatus(message, isError = false, { persist = false } = {}) {
  if (statusPanel) statusPanel.remove();

  statusPanel = document.createElement("div");
  Object.assign(statusPanel.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    width: "320px",
    padding: "12px",
    background: isError ? "#fde8e8" : "#e8f4f8",
    color: isError ? "#b00020" : "#0d47a1",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    zIndex: "2147483647",
    fontFamily: "Arial, sans-serif",
    fontSize: "13px",
  });

  const icon = document.createElement("div");
  icon.style.marginRight = "8px";
  icon.textContent = isError ? "⚠️" : "ℹ️";

  const messageEl = document.createElement("div");
  messageEl.textContent = message;

  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  Object.assign(closeButton.style, {
    marginLeft: "12px",
    background: "none",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
    color: "inherit",
    padding: "0",
  });
  closeButton.onclick = (e) => {
    e.stopPropagation();
    if (statusPanel) {
      statusPanel.remove();
      statusPanel = null;
    }
  };

  statusPanel.appendChild(icon);
  statusPanel.appendChild(messageEl);
  statusPanel.appendChild(closeButton);
  document.body.appendChild(statusPanel);

  if (!persist && !isError) {
    setTimeout(() => {
      if (statusPanel) {
        statusPanel.remove();
        statusPanel = null;
      }
    }, 4500);
  }
}

// Create a small popup container near the text selection with two buttons
function createPopup(selectedText, x, y) {
  removePopup();

  popupContainer = document.createElement("div");
  Object.assign(popupContainer.style, {
    position: "absolute",
    top: `${y}px`,
    left: `${x}px`,
    transform: "translateY(8px)",
    background: "#fff",
    color: "#111",
    borderRadius: "8px",
    padding: "8px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
    display: "flex",
    gap: "8px",
    alignItems: "center",
    zIndex: 2147483647,
    fontFamily: "Arial, sans-serif",
    fontSize: "13px",
  });

  const info = document.createElement("div");
  info.textContent = "Actions";
  Object.assign(info.style, { fontWeight: "600", marginRight: "6px" });
  popupContainer.appendChild(info);

  const summarizeBtn = document.createElement("button");
  summarizeBtn.textContent = "Summarize";
  Object.assign(summarizeBtn.style, buttonBaseStyle());

  const mapsBtn = document.createElement("button");
  mapsBtn.textContent = "Get Directions";
  Object.assign(mapsBtn.style, buttonBaseStyle());

  popupContainer.appendChild(summarizeBtn);
  popupContainer.appendChild(mapsBtn);

  // Prevent events from reaching the page
  popupContainer.addEventListener("mousedown", (e) => e.stopPropagation());
  popupContainer.addEventListener("click", (e) => e.stopPropagation());

  document.body.appendChild(popupContainer);

  // Click handlers
  summarizeBtn.addEventListener("click", async () => {
    try {
      await chrome.storage.local.set({ lastSelection: selectedText });
    } catch (err) {
      console.error("Error saving selection:", err);
      showStatus("Failed to save selection", true, { persist: true });
      removePopup();
      return;
    }

    if (!chrome.runtime?.id) {
      window.location.reload();
      return;
    }

    try {
      await chrome.runtime.sendMessage({ type: "OPEN_SUMMARY_SIDEPANEL" });
    } catch (err) {
      console.error("Error opening summary sidepanel:", err);
      showStatus("Failed to open summary panel", true, { persist: true });
      if (err.message && err.message.includes("context invalidated"))
        window.location.reload();
    } finally {
      removePopup();
    }
  });

  mapsBtn.addEventListener("click", async () => {
    try {
      // Check auth
      const authCheck = await chrome.runtime.sendMessage({
        type: "CHECK_AUTH",
      });
      if (!authCheck?.authenticated) {
        showStatus("Please sign in to continue...", false, { persist: true });
        const authResult = await chrome.runtime.sendMessage({
          type: "AUTHENTICATE",
        });
        if (!authResult?.success) throw new Error("Authentication failed");
      }

      const response = await chrome.runtime.sendMessage({
        type: "GET_DIRECTIONS",
        text: selectedText,
      });
      if (!response?.ok)
        throw new Error(response?.error || "Failed to get directions");

      showStatus("Opening Google Maps with directions...", false, {
        persist: false,
      });
    } catch (err) {
      console.error("Error getting directions:", err);
      showStatus(err.message || "Failed to get directions", true, {
        persist: true,
      });
    } finally {
      removePopup();
    }
  });

  // Cleanup handlers: remove on scroll/resize/escape or selection change
  const cleanup = () => removePopup();
  window.addEventListener("scroll", cleanup, { once: true, passive: true });
  window.addEventListener("resize", cleanup, { once: true });
  document.addEventListener("selectionchange", cleanup, { once: true });
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") cleanup();
    },
    { once: true }
  );
}

function buttonBaseStyle() {
  return {
    background: "#1a73e8",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "6px 10px",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
    fontSize: "13px",
  };
}

function removePopup() {
  if (popupContainer) {
    popupContainer.remove();
    popupContainer = null;
  }
}

document.addEventListener("mouseup", (e) => {
  try {
    const sel = window.getSelection();
    const text = (sel?.toString() || "").trim();
    if (!text) {
      removePopup();
      return;
    }

    // Position near selection bounding rect if available
    let x = e.pageX + 10;
    let y = e.pageY + 10;
    try {
      if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect && rect.top !== 0 && rect.left !== 0) {
          x = window.scrollX + rect.left;
          y = window.scrollY + rect.top - 36; // place above selection when possible
        }
      }
    } catch (err) {
      // ignore
    }

    createPopup(text, x, y);
  } catch (err) {
    console.error("Error handling selection popup:", err);
  }
});
