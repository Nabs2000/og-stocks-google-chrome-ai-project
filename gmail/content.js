chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_POPUP") {
    createPopup(message.selectedText);
  }
});

function createPopup(selectedText) {
  // Prevent multiple popups
  if (document.getElementById("ai-email-popup")) return;

  const popup = document.createElement("div");
  popup.id = "ai-email-popup";
  popup.innerHTML = `
    <div class="popup-container">
      <h3>AI Email Generator</h3>
      <p><strong>Selected text:</strong></p>
      <textarea readonly>${selectedText}</textarea>
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
    chrome.runtime.sendMessage({
      type: "GENERATE_EMAIL",
      selectedText,
      purpose,
      tone,
    });
    popup.remove();
  });
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
    .popup-container h3 {
      margin-top: 0;
    }
    textarea {
      width: 100%;
      height: 80px;
      resize: none;
      margin-bottom: 8px;
    }
    input {
      width: 100%;
      padding: 6px;
      margin-bottom: 12px;
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
  `;
  document.head.appendChild(style);
}
