// API Key is loaded from chrome.storage.local
let API_KEY = '';

// Load API key from storage
chrome.storage.local.get('GEMINI_API_KEY', (data) => {
  API_KEY = data.GEMINI_API_KEY || '';
  if (!API_KEY) {
    console.warn('No API key found. Please set it in the extension options.');
  }
});

// Optionally move this into a separate module; keeping it here is simplest
async function summarizeWithGemini(text) {
  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" +
    encodeURIComponent(API_KEY);

  const payload = {
    contents: [
      {
        parts: [
          {
            text:
              "Summarize concisely (3-5 bullets). Keep key facts, dates, and names if present:\n\n" +
              text
          }
        ]
      }
    ]
  };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini HTTP ${resp.status}: ${t}`);
  }

  const data = await resp.json();
  // Gemini responses can vary; this path matches your original code
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Summary not available."
  );
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "TEXT_SELECTED") {
      try {
        const summary = await summarizeWithGemini(message.text);
        sendResponse({ ok: true, summary });
      } catch (e) {
        console.error("Gemini error:", e);
        sendResponse({ ok: false, summary: "API error. See console." });
      }
    }
  })();

  // IMPORTANT: keep the message channel open for async sendResponse
  return true;
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "OPEN_SUMMARY_POPUP") {
    // Try to open the popup programmatically
    chrome.action.openPopup().catch((err) => {
      console.warn("Could not open popup automatically:", err);
    });
  }
});
