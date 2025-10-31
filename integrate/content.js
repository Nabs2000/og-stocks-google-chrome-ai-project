let floatingMenu = null;
let statusPanel = null;

// --- Helper Function from content-gmaps.js ---
function showStatus(message, isError = false, { persist = false } = {}) {
  if (statusPanel) statusPanel.remove();

  statusPanel = document.createElement("div");
  Object.assign(statusPanel.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    width: "300px",
    padding: "15px",
    background: isError ? "#fde8e8" : "#e8f4f8",
    color: isError ? "#d32f2f" : "#0d47a1",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    zIndex: "100000",
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  });

  const icon = document.createElement("div");
  if (isError) {
    icon.textContent = "⚠️";
  } else {
    icon.className = "loading-spinner"; // This class is in content-gmaps.css
  }

  const messageEl = document.createElement("div");
  messageEl.textContent = message;

  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.style.cssText = `
    margin-left: auto; background: none; border: none; font-size: 20px;
    cursor: pointer; color: inherit; padding: 0; line-height: 1;
  `;
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
    }, 5000);
  }
}

// --- Merged Mouseup Listener ---

document.addEventListener("mouseup", (e) => {
  // Remove old menu if any
  if (floatingMenu) {
    floatingMenu.remove();
    floatingMenu = null;
  }

  const text = (window.getSelection()?.toString() || "").trim();
  if (!text) return;

  // --- Create the Floating Menu Container ---
  floatingMenu = document.createElement("div");
  Object.assign(floatingMenu.style, {
    position: "absolute",
    top: `${e.pageY + 10}px`,
    left: `${e.pageX + 10}px`,
    background: "white",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "4px",
    zIndex: 999999,
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
    display: "flex",
    gap: "4px"
  });

  // --- Create the "Summarize" Button ---
  const summarizeBtn = document.createElement("button");
  summarizeBtn.textContent = "Summarize";
  Object.assign(summarizeBtn.style, {
    background: "#1a73e8", color: "white", border: "none",
    borderRadius: "6px", padding: "6px 10px", fontSize: "12px", cursor: "pointer"
  });

  // --- Create the "Get Directions" Button ---
  const directionsBtn = document.createElement("button");
  directionsBtn.textContent = "Get Directions";
  Object.assign(directionsBtn.style, {
    background: "#34a853", color: "white", border: "none",
    borderRadius: "6px", padding: "6px 10px", fontSize: "12px", cursor: "pointer"
  });

  // --- Event Logic ---
  
  // Helper to prevent click from retriggering mouseup
  const stopEvent = (ev) => {
    ev.stopPropagation();
  };
  floatingMenu.addEventListener("mousedown", stopEvent);
  floatingMenu.addEventListener("mouseup", stopEvent);

  // --- "Summarize" Button Click Logic (from content-summarize.js) ---
  summarizeBtn.addEventListener("click", async (ev) => {
    stopEvent(ev);
    
    try {
      const selectedText = (window.getSelection()?.toString() || "").trim();
      if (!selectedText) return;

      await chrome.storage.local.set({ lastSelection: selectedText });
      await chrome.runtime.sendMessage({ type: "OPEN_SUMMARY_SIDEPANEL" });

    } catch (error) {
      console.error('Error during summarize click:', error);
      if (error.message.includes('context invalidated')) {
        window.location.reload(); // Good practice from your original file
      }
    } finally {
      if (floatingMenu) {
        floatingMenu.remove();
        floatingMenu = null;
      }
    }
  });

  // --- "Get Directions" Button Click Logic (from content-gmaps.js) ---
  directionsBtn.addEventListener("click", async (ev) => {
    stopEvent(ev);

    try {
      const selectedText = (window.getSelection()?.toString() || "").trim();
      if (!selectedText) return;
      
      showStatus("Analyzing text for locations...", false, { persist: true });

      const authCheck = await chrome.runtime.sendMessage({ type: "CHECK_AUTH" });

      if (!authCheck.authenticated) {
        showStatus("Please sign in to continue...");
        const authResult = await chrome.runtime.sendMessage({ type: "AUTHENTICATE" });

        if (!authResult.success) {
          throw new Error("Authentication failed. Please try again.");
        }
      }

      showStatus("Getting directions...", false, { persist: true });

      const response = await chrome.runtime.sendMessage({
        type: "GET_DIRECTIONS",
        text: selectedText,
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to get directions");
      }

      showStatus("Opening Google Maps with directions...", false, { persist: false });

    } catch (error) {
      console.error("Error:", error);
      showStatus(error.message || "An error occurred", true, { persist: true });
    } finally {
      if (floatingMenu) {
        floatingMenu.remove();
        floatingMenu = null;
      }
    }
  });

  // Add buttons to menu and menu to page
  floatingMenu.appendChild(summarizeBtn);
  floatingMenu.appendChild(directionsBtn);
  document.body.appendChild(floatingMenu);
});