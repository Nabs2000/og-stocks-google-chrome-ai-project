document.addEventListener("DOMContentLoaded", function () {
  const apiKeyInput = document.getElementById("api-key");
  const saveButton = document.getElementById("save");
  const statusDiv = document.getElementById("status");

  // Load saved API key if it exists
  chrome.storage.local.get("GOOGLE_MAPS_API_KEY", function (data) {
    if (data.GOOGLE_MAPS_API_KEY) {
      apiKeyInput.value = data.GOOGLE_MAPS_API_KEY;
    }
  });

  // Save API key when the save button is clicked
  saveButton.addEventListener("click", function () {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus("Please enter an API key", "error");
      return;
    }

    // Save to chrome.storage
    chrome.storage.local.set({ GOOGLE_MAPS_API_KEY: apiKey }, function () {
      showStatus("API key saved successfully!", "success");
      // Clear the status after 3 seconds
      setTimeout(() => {
        statusDiv.style.display = "none";
      }, 3000);
    });
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = "status " + type;
    statusDiv.style.display = "block";
  }
});
