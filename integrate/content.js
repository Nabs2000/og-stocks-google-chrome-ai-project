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
  floatingMenu.id = "floating-ai-menu";
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

  const gmailBtn = document.createElement("button");
  gmailBtn.textContent = "Generate Gmail";
  Object.assign(gmailBtn.style, {
    background: "#c7006e", color: "white", border: "none",
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
  }
);

  gmailBtn.addEventListener("click", (ev) => {
    const selectedText = (window.getSelection()?.toString() || "").trim();
      if (!selectedText) return;
    createGmailPopup(selectedText);
  });

  // Add buttons to menu and menu to page
  floatingMenu.appendChild(summarizeBtn);
  floatingMenu.appendChild(directionsBtn);
  floatingMenu.appendChild(gmailBtn);
  document.body.appendChild(floatingMenu);
});


// --- Gmail Logic ---------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "EMAIL_GENERATION_DONE") {
    const popup = document.getElementById("ai-email-popup");
    if (popup) popup.remove();
  }
});

function createGmailPopup(selectedText) {
  // Prevent multiple popups
  if (document.getElementById("ai-email-popup")) return;

  const floatingMenu = document.getElementById("floating-ai-menu")
  if (floatingMenu) {
    floatingMenu.remove();
  }

  const popup = document.createElement("div");
  popup.id = "ai-email-popup";
  popup.innerHTML = `
    <div class="popup-container">
      <h3>Clipboard AI: Genearate an email</h3>
      <p><strong>Selected text:</strong></p>
      <label>What is this email for?</label>
      <input id="email-purpose" placeholder="e.g., Job application, follow-up, etc." />
      <label for="email-tone">Tone</label>
      <select id="email-tone">
        <option value="formal">Formal(default)</option>
        <option value="neutral">Neutral</option>
        <option value="casual">Casual</option>
      </select>
      <div class="popup-buttons">
        <button id="cancel-btn">Cancel</button>
        <button id="generate-btn">Generate</button>
      </div>
      <div id="popup-loader" style="display:none;">
        <div class="spinner"></div>
        <p>Generating email...</p>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
  injectStyles();

  // Button logic
  popup.querySelector("#cancel-btn").addEventListener("click", () => {
    popup.remove();
  });

  popup.querySelector("#generate-btn").addEventListener("click", () => {
    const purpose = popup.querySelector("#email-purpose").value.trim();
    const tone = popup.querySelector("#email-tone").value;
    if (!purpose) {
      alert("Please enter what the email is for.");
      return;
    }
    if (!tone) {
      tone = "formal";
    }
    showLoader();
    chrome.runtime.sendMessage({
      type: "GENERATE_EMAIL",
      selectedText,
      purpose,
      tone,
    });
  });
}

function showLoader() {
  document.querySelector("#popup-loader").style.display = "flex";
  document.querySelector("#generate-btn").disabled = true;
}

// function hidePopup() {
//   // const loader = document.querySelector("#popup-loader");
//   // if (loader) loader.style.display = "none";
//   // const generateBtn = document.querySelector("#generate-btn");
//   // const cancelBtn = document.querySelector("#cancel-btn");
//   // if (generateBtn) generateBtn.disabled = false;
//   // if (cancelBtn) cancelBtn.disabled = false;
//   const popup = document.getElementById("ai-email-popup");
//   if (popup) popup.remove();
// }

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    #ai-email-popup {
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border: 1px solid #ccc;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      border-radius: 8px;
      padding: 16px;
      z-index: 99999;
      width: 400px;
      font-family: Arial, sans-serif;
    }
    textarea, input, select {
      width: 100%;
      margin-bottom: 12px;
      padding: 6px;
    }
    .popup-buttons {
      text-align: right;
    }
    button {
      margin-left: 8px;
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    #generate-btn {
      background: #007bff;
      color: white;
    }
    #cancel-btn {
      background: #ccc;
    }
    #popup-loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 12px;
      color: #333;
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #007bff;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 0.8s linear infinite;
      margin-bottom: 8px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}