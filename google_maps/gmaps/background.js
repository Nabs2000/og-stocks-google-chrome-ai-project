// Function to check if user is authenticated
async function isAuthenticated() {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      resolve(!!token);
    });
  });
}

// Function to authenticate user
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

// Function to extract locations using AI
async function extractLocationsWithAI(text) {
  console.log("Analyzing text for locations...");
  const startTime = Date.now();

  try {
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error("No text provided to analyze");
    }

    // Check if the LanguageModel API is available
    const availability = await LanguageModel.availability();
    if (availability === "unavailable") {
      throw new Error(
        "Language model is not available. Please try again later."
      );
    }

    // Create a session with the LanguageModel
    const session = await LanguageModel.create({
      initialPrompts: [
        {
          role: "system",
          content: `You are a helpful assistant that extracts location information from text.
          The user has selected some text and wants to get directions to a location mentioned in it.
          
          Your task is to analyze the text and extract the most likely destination location.
          The destination should be a specific address, place name, or point of interest. There may be multiple locations mentioned in the text, but only the most specific one should be extracted.
          
          Respond with a JSON object with the following structure:
          {
            "destination": "The extracted destination location",
            "confidence": "high/medium/low",
            "reason": "Brief explanation of why this was chosen as the destination"
          }
          
          If no clear destination can be determined, return:
          {
            "destination": null,
            "confidence": "none",
            "reason": "Explanation of why no destination could be determined"
          }`,
        },
      ],
      // Use default parameters for temperature and topK
      temperature: 0.2, // Lower temperature for more focused results
      topK: 40,
    });

    // Send the prompt to the model
    const response = await session.prompt(trimmedText);

    // Try to parse the response as JSON
    let result;
    try {
      // Try to find a JSON object in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
    } catch (e) {
      throw new Error("Failed to parse AI response");
    }

    // Validate the response
    if (!result || typeof result !== "object") {
      throw new Error("Invalid response from AI service");
    }

    if (!result.destination || result.confidence === "none") {
      throw new Error(
        "Couldn't determine a clear destination from the selected text. Please try selecting more specific text or a clear location."
      );
    }

    console.log("AI location extraction result:", {
      destination: result.destination,
      confidence: result.confidence,
      reason: result.reason,
    });

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

// Simple console logging functions to replace the panel updates
function logStatus(status, message) {
  console.log(`[${status.toUpperCase()}] ${message}`);
}

function logDebug(message, data = null) {
  if (data) {
    console.log(message, data);
  } else {
    console.log(message);
  }
}

// Function to get directions from Google Maps
async function getDirections(origin, destination) {
  console.log(`Getting directions from ${origin} to ${destination}`);
  const startTime = Date.now();

  // Build Google Maps URL
  const params = new URLSearchParams({
    api: "1",
    destination: destination,
    travelmode: "driving",
  });

  // Add origin only if we have it
  if (origin && origin !== "current location") {
    params.append("origin", origin);
  }

  const mapsUrl = `https://www.google.com/maps/dir/?${params.toString()}`;

  // Log the action
  console.log("Opening Google Maps with URL:", mapsUrl);

  // Open in a new tab
  chrome.tabs.create({ url: mapsUrl });

  const duration = Date.now() - startTime;
  console.log(`Directions opened in ${duration}ms`);
  return { success: true, url: mapsUrl };
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "CHECK_AUTH") {
        const authenticated = await isAuthenticated();
        sendResponse({ authenticated });
        return true;
      }

      if (message?.type === "AUTHENTICATE") {
        const result = await authenticate();
        sendResponse(result);
        return true;
      }

      if (message?.type === "GET_DIRECTIONS") {
        // Check authentication first
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          sendResponse({
            ok: false,
            error: "Not authenticated",
            requiresAuth: true,
          });
          return true;
        }

        try {
          // Extract locations from the selected text
          console.log("Extracting locations from text...");
          const { origin, destination, confidence, reason } =
            await extractLocationsWithAI(message.text);

          if (!destination) {
            const errorMsg =
              "Could not determine a destination from the selected text";
            console.error(errorMsg);
            throw new Error(errorMsg);
          }

          // If the confidence is low, throw an error
          if (confidence === "low") {
            throw new Error(
              "Could not determine a clear destination from the selected text. Please try selecting more specific text or a clear location."
            );
          }

          // Log extraction results
          console.log("Location extraction results:", {
            origin,
            destination,
            confidence,
            reason,
          });

          // Get and open directions
          console.log(`Opening directions to ${destination}...`);

          const result = await getDirections(
            origin || "current location",
            destination
          );

          // Log successful directions
          console.log("Directions opened successfully", {
            origin: origin || "current location",
            destination,
            url: result.url,
          });

          sendResponse({ ok: true, url: result.url });
        } catch (error) {
          console.error("Error processing directions:", error);
          sendResponse({
            ok: false,
            error: error.message,
            requiresAuth: error.message.includes("authentication"),
          });
        }
        return true;
      }

      // If we get here, the message type is not recognized
      sendResponse({
        ok: false,
        error: `Unknown message type: ${message?.type}`,
      });
    } catch (error) {
      console.error("Unexpected error in message handler:", error);
      sendResponse({
        ok: false,
        error: error.message || "An unexpected error occurred",
      });
    }
  })();

  // Keep the message channel open for async sendResponse
  return true;
});
