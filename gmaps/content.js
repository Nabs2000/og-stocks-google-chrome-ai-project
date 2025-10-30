let googleMapsButton = null;
let statusPanel = null;

function showStatus(message, isError = false, { persist = false } = {}) {
  // Remove existing panel if any
  if (statusPanel) statusPanel.remove();

  // Create status panel
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

  // Add loading spinner or error icon
  const icon = document.createElement("div");
  if (isError) {
    icon.textContent = "⚠️";
  } else {
    icon.className = "loading-spinner";
    icon.style.cssText = `
      width: 16px;
      height: 16px;
      border: 2px solid rgba(13, 71, 161, 0.3);
      border-radius: 50%;
      border-top-color: #0d47a1;
      animation: spin 1s ease-in-out infinite;
    `;

    // Add spin animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // Add message
  const messageEl = document.createElement("div");
  messageEl.textContent = message;

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.style.cssText = `
    margin-left: auto;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: inherit;
    padding: 0;
    line-height: 1;
  `;
  closeButton.onclick = (e) => {
    e.stopPropagation();
    if (statusPanel) {
      statusPanel.remove();
      statusPanel = null;
    }
  };

  // Assemble the panel
  statusPanel.appendChild(icon);
  statusPanel.appendChild(messageEl);
  statusPanel.appendChild(closeButton);
  document.body.appendChild(statusPanel);

  // Auto-remove after 5 seconds for non-error messages
  if (!persist && !isError) {
    setTimeout(() => {
      if (statusPanel) {
        statusPanel.remove();
        statusPanel = null;
      }
    }, 5000);
  }
}

document.addEventListener("mouseup", (e) => {
  const text = (window.getSelection()?.toString() || "").trim();

  // Remove old button if any
  if (googleMapsButton) {
    googleMapsButton.remove();
    googleMapsButton = null;
  }

  // Only show button if text is selected
  if (!text) return;

  // Create floating button
  googleMapsButton = document.createElement("button");
  googleMapsButton.textContent = "Get Directions";
  Object.assign(googleMapsButton.style, {
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
  const stopEvent = (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
  };

  googleMapsButton.addEventListener("mousedown", stopEvent);
  googleMapsButton.addEventListener("mouseup", stopEvent);

  // Handle click
  googleMapsButton.addEventListener("click", async (ev) => {
    stopEvent(ev);

    try {
      console.log("Button clicked");
      const selectedText = (window.getSelection()?.toString() || "").trim();
      if (!selectedText) return;
      console.log("Selected text:", selectedText);
      // Show loading message
      showStatus("Analyzing text for locations...", false, { persist: true });

      // First check if user is authenticated
      const authCheck = await chrome.runtime.sendMessage({
        type: "CHECK_AUTH",
      });
      console.log("Authentication check result:", authCheck);

      // If not authenticated, prompt for authentication
      if (!authCheck.authenticated) {
        console.log("User is not authenticated");
        showStatus("Please sign in to continue...");
        const authResult = await chrome.runtime.sendMessage({
          type: "AUTHENTICATE",
        });

        console.log("Authentication result:", authResult);
        if (!authResult.success) {
          throw new Error("Authentication failed. Please try again.");
        }
      }

      console.log("User is authenticated");

      showStatus("Getting directions...", false, { persist: true });

      // Now get directions
      const response = await chrome.runtime.sendMessage({
        type: "GET_DIRECTIONS",
        text: selectedText,
      });

      if (!response.ok) {
        if (response.requiresAuth) {
          // This shouldn't happen since we just authenticated, but handle it anyway
          throw new Error(
            "Authentication is required. Please sign in and try again."
          );
        }
        throw new Error(response.error || "Failed to get directions");
      }

    } catch (error) {
      console.error("Error:", error);
      showStatus(error.message || "An error occurred", true);
    } finally {
      // Clean up the button
      if (googleMapsButton) {
        googleMapsButton.remove();
        googleMapsButton = null;
      }
    }
  });

  document.body.appendChild(googleMapsButton);
});
