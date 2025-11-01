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
      <div class="popup-header">
        <h3><i class="fas fa-envelope"></i> Generate Email</h3>
        <button class="popup-close" id="close-btn">&times;</button>
      </div>
      <div class="popup-content">
        <div class="form-group">
          <label for="email-purpose">What is this email for?</label>
          <input type="text" id="email-purpose" class="form-control" placeholder="e.g., Job application, follow-up, etc." required>
        </div>
        
        <div class="form-group">
          <label for="email-tone">Tone</label>
          <select id="email-tone" class="form-control">
            <option value="formal">Formal (default)</option>
            <option value="neutral">Neutral</option>
            <option value="casual">Casual</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Selected Text</label>
          <div class="selected-text-preview">${selectedText || 'No text selected'}</div>
        </div>
      </div>
      
      <div class="popup-footer">
        <button id="cancel-btn" class="btn btn-secondary">
          <i class="fas fa-times"></i> Cancel
        </button>
        <button id="generate-btn" class="btn btn-primary">
          <i class="fas fa-magic"></i> Generate Email
        </button>
      </div>
      
      <div id="popup-loader">
        <div class="spinner"></div>
        <p>Generating your email...</p>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
  injectStyles();

  // Button logic
  const closePopup = () => {
    popup.classList.remove('visible');
    setTimeout(() => popup.remove(), 200);
  };
  
  popup.querySelector("#cancel-btn").addEventListener("click", closePopup);
  popup.querySelector("#close-btn").addEventListener("click", closePopup);
  
  // Close when clicking outside the popup
  popup.addEventListener('click', (e) => {
    if (e.target === popup) closePopup();
  });
  
  // Show the popup with animation
  setTimeout(() => popup.classList.add('visible'), 10);

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
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --primary: #4f46e5;
      --primary-hover: #4338ca;
      --danger: #ef4444;
      --danger-hover: #dc2626;
      --border: #e5e7eb;
      --text: #1f2937;
      --text-secondary: #4b5563;
      --radius: 8px;
      --shadow: 0 4px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05);
      --transition: all 0.2s ease;
    }
    
    #ai-email-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      border-radius: var(--radius);
      padding: 0;
      z-index: 100000;
      width: 440px;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translate(-50%, -45%);
      transition: opacity 0.2s ease, transform 0.2s ease;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    #ai-email-popup.visible {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
    
    .popup-container {
      padding: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    
    .popup-header {
      padding: 16px 20px;
      background: var(--primary);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .popup-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .popup-header h3 i {
      font-size: 18px;
    }
    
    .popup-close {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: white;
      font-size: 16px;
      transition: background 0.2s ease;
    }
    
    .popup-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .popup-content {
      padding: 20px;
      flex: 1;
      overflow-y: auto;
    }
    
    .popup-footer {
      padding: 16px 20px;
      background: #f9fafb;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: var(--text);
      font-size: 14px;
    }
    
    textarea, input, select {
      width: 100%;
      padding: 10px 12px;
      background: #ffffff;
      color: #000000;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    
    textarea:focus, input:focus, select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }
    
    textarea {
      min-height: 100px;
      resize: vertical;
    }
    
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
      transition: var(--transition);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid transparent;
    }
    
    .btn-primary {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
    
    .btn-primary:hover {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
      transform: translateY(-1px);
    }
    
    .btn-secondary {
      background: white;
      color: var(--text);
      border-color: var(--border);
    }
    
    .btn-secondary:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }
    
    .btn i {
      font-size: 14px;
      width: 16px;
      display: inline-flex;
      justify-content: center;
    }
    
    .form-control {
      width: 100%;
      padding: 10px 12px;
      background: #ffffff;
      color: #000000;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    
    .form-control:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
      outline: none;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group:last-child {
      margin-bottom: 0;
    }
    
    #popup-loader {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px 0;
    }
    
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(79, 70, 229, 0.1);
      border-radius: 50%;
      border-top-color: var(--primary);
      animation: spin 0.8s linear infinite;
      margin-bottom: 12px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .selected-text-preview {
      background: #f9fafb;
      border: 1px dashed var(--border);
      border-radius: 6px;
      padding: 12px;
      margin: 12px 0;
      max-height: 120px;
      overflow-y: auto;
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
  `;
  document.head.appendChild(style);
}