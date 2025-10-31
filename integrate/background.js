// --- Helper Functions from background-summarize.js ---
async function summarizeBuiltIn(text) {
  // Check availability
  const avail = await Summarizer.availability();
  if (avail === "unavailable") {
    throw new Error("Summarizer API not available on this browser");
  }

  // Create the summarizer (choose options)
  const summarizer = await Summarizer.create({
    type: "key-points",
    format: "markdown",
    length: "short"
  });

  // Perform summarization
  const summary = await summarizer.summarize(text);
  return summary;
}

// --- Helper Functions from background-gmaps.js ---

async function isAuthenticated() {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      resolve(!!token);
    });
  });
}

async function authenticate() {
  try {
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!token) {
          reject(new Error("Authentication failed"));
        } else {
          resolve(token);
        }
      });
    });
    return { success: true, token };
  } catch (error) {
    console.error("Authentication error:", error);
    return { success: false, error: error.message };
  }
}

async function extractLocationsWithAI(text) {
  console.log("Analyzing text for locations...");
  const startTime = Date.now();

  try {
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error("No text provided to analyze");
    }

    const availability = await LanguageModel.availability();
    if (availability === "unavailable") {
      throw new Error("Language model is not available. Please try again later.");
    }

    const session = await LanguageModel.create({
      initialPrompts: [
        {
          role: "system",
          content: `You are a helpful assistant that extracts location information from text.
          The user has selected some text and wants to get directions to a location mentioned in it.
          Your task is to analyze the text and extract the most likely destination location.
          Respond with a JSON object with the following structure:
          {
            "destination": "The extracted destination location",
            "confidence": "high/medium/low",
            "reason": "Brief explanation of why this was chosen as the destination"
          }
          If no clear destination can be determined, return:
          { "destination": null, "confidence": "none", "reason": "Explanation" }`
        },
      ],
      temperature: 0.2,
      topK: 40,
    });

    const response = await session.prompt(trimmedText);

    let result;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
    } catch (e) {
      throw new Error("Failed to parse AI response");
    }

    if (!result || !result.destination || result.confidence === "none") {
      throw new Error(
        "Couldn't determine a clear destination from the selected text. Please try selecting more specific text or a clear location."
      );
    }

    console.log("AI location extraction result:", result);

    return {
      origin: null, // Let Google Maps use current location
      destination: result.destination,
      confidence: result.confidence,
      reason: result.reason,
    };
  } catch (error) {
    const errorMessage = `Error extracting locations: ${error.message}`;
    console.error(errorMessage);
    return {
      origin: null,
      destination: text.trim(),
      confidence: "low",
      reason: "Using original text as fallback: " + error.message,
    };
  } finally {
    const duration = Date.now() - startTime;
    console.log(`Location extraction completed in ${duration}ms`);
  }
}

async function getDirections(origin, destination) {
  console.log(`Getting directions from ${origin} to ${destination}`);
  
  const params = new URLSearchParams({
    api: "1",
    destination: destination,
    travelmode: "driving",
  });

  if (origin && origin !== "current location") {
    params.append("origin", origin);
  }

  // Note: The original URL was invalid. Corrected to use https:// and standard query params.
  const mapsUrl = `https://www.google.com/maps/dir/?${params.toString()}`;

  console.log("Opening Google Maps with URL:", mapsUrl);
  chrome.tabs.create({ url: mapsUrl });

  return { success: true, url: mapsUrl };
}

// --- SINGLE Merged Message Listener ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      // --- Messages from Summarize Feature ---
      if (message?.type === "TEXT_SELECTED") {
        const summary = await summarizeBuiltIn(message.text);
        sendResponse({ ok: true, summary });
      } 
      
      else if (message?.type === "OPEN_SUMMARY_SIDEPANEL") {
        if (sender.tab?.id) {
          await chrome.sidePanel.open({ tabId: sender.tab.id });
          sendResponse({ ok: true });
        } else {
          console.warn("Could not open side panel, sender.tab.id is missing.");
          sendResponse({ ok: false, error: "Missing tab ID" });
        }
      }

      // --- Messages from Gmaps Feature ---
      else if (message?.type === "CHECK_AUTH") {
        const authenticated = await isAuthenticated();
        sendResponse({ authenticated });
      } 
      
      else if (message?.type === "AUTHENTICATE") {
        const result = await authenticate();
        sendResponse(result);
      } 
      
      else if (message?.type === "GET_DIRECTIONS") {
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          sendResponse({ ok: false, error: "Not authenticated", requiresAuth: true });
          return; // Stop execution
        }

        try {
          const { origin, destination, confidence, reason } = await extractLocationsWithAI(message.text);

          if (!destination) {
            throw new Error("Could not determine a destination.");
          }
          if (confidence === "low") {
             throw new Error("Could not determine a clear destination. Please try selecting more specific text.");
          }

          console.log("Location extraction results:", { origin, destination, confidence, reason });
          
          const result = await getDirections(origin || "current location", destination);
          sendResponse({ ok: true, url: result.url });

        } catch (error) {
          console.error("Error processing directions:", error);
          sendResponse({ ok: false, error: error.message, requiresAuth: error.message.includes("authentication") });
        }
      }
      
      // --- Default case ---
      else {
        // Optional: handle unknown message types
        // sendResponse({ ok: false, error: `Unknown message type: ${message?.type}` });
      }

    } catch (error) {
      console.error("Unexpected error in message handler:", error);
      sendResponse({ ok: false, error: error.message || "An unexpected error occurred" });
    }
  })();

  // Keep the message channel open for all async sendResponse calls
  return true;
});