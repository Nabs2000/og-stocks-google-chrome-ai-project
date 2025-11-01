chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_POPUP") {
    createPopup(message.selectedText);
  } else if (message.type === "EMAIL_GENERATION_DONE") {
    hideLoader();
  }
});

function createPopup(selectedText) {
  // Prevent multiple popups
  if (document.getElementById("ai-email-popup")) return;

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
//   document.querySelector("#cancel-btn").disabled = true;
}

function hideLoader() {
  const loader = document.querySelector("#popup-loader");
  if (loader) loader.style.display = "none";
  const generateBtn = document.querySelector("#generate-btn");
  const cancelBtn = document.querySelector("#cancel-btn");
  if (generateBtn) generateBtn.disabled = false;
  if (cancelBtn) cancelBtn.disabled = false;
  const popup = document.getElementById("ai-email-popup");
  if (popup) popup.remove();
}

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
