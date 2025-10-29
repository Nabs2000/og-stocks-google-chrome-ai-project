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
          reject(new Error('Authentication failed'));
        } else {
          resolve(token);
        }
      });
    });
    return { success: true, token };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: error.message };
  }
}

// Function to extract locations using AI
async function extractLocationsWithAI(text) {
  try {
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error('No text provided to analyze');
    }

    // Check if the LanguageModel API is available
    const availability = await LanguageModel.availability();
    if (availability === 'unavailable') {
      throw new Error('Language model is not available. Please try again later.');
    }

    // Create a session with the LanguageModel
    const session = await LanguageModel.create({
      initialPrompts: [
        {
          role: 'system',
          content: `You are a helpful assistant that extracts location information from text.
          The user has selected some text and wants to get directions to a location mentioned in it.
          
          Your task is to analyze the text and extract the most likely destination location.
          The destination should be a specific address, place name, or point of interest.
          
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
          }`
        }
      ],
      // Use default parameters for temperature and topK
      temperature: 0.2, // Lower temperature for more focused results
      topK: 40
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
      throw new Error('Failed to parse AI response');
    }

    // Validate the response
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from AI service');
    }

    if (!result.destination || result.confidence === 'none') {
      throw new Error("Couldn't determine a clear destination from the selected text. Please try selecting more specific text or a clear location.");
    }

    console.log('AI location extraction result:', {
      destination: result.destination,
      confidence: result.confidence,
      reason: result.reason
    });

    return {
      origin: null, // Let Google Maps use current location
      destination: result.destination,
      confidence: result.confidence,
      reason: result.reason
    };
  } catch (error) {
    console.error('Error in extractLocationsWithAI:', error);
    // Fallback to using the original text if AI parsing fails
    return {
      origin: null,
      destination: text,
      confidence: 'low',
      reason: 'Using original text as fallback: ' + error.message
    };
  }
}

// Function to get directions from Google Maps
async function getDirections(origin, destination) {
  const data = await chrome.storage.local.get("GOOGLE_MAPS_API_KEY");
  const API_KEY = data.GOOGLE_MAPS_API_KEY || "";

  if (!API_KEY) {
    throw new Error(
      "No Google Maps API key found. Please set it in the extension options."
    );
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(destination)}&key=${API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`Google Maps API error: ${response.status}`);
  }

  const result = await response.json();

  if (result.status !== "OK") {
    throw new Error(
      `Google Maps API error: ${result.status} - ${
        result.error_message || "Unknown error"
      }`
    );
  }

  return result;
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
            error: 'Not authenticated',
            requiresAuth: true 
          });
          return true;
        }

        try {
          // Extract locations from the selected text
          const { origin, destination } = await extractLocationsWithAI(message.text);
          
          if (!destination) {
            throw new Error('Could not determine a destination from the selected text');
          }

          // Build Google Maps URL
          const params = new URLSearchParams({
            api: '1',
            destination: destination,
            travelmode: 'driving'
          });
          
          // Add origin only if we have it
          if (origin) {
            params.append('origin', origin);
          }
          
          const mapsUrl = `https://www.google.com/maps/dir/?${params.toString()}`;
          
          // Open in a new tab
          chrome.tabs.create({ url: mapsUrl });
          
          sendResponse({ ok: true });
        } catch (error) {
          console.error("Error processing directions:", error);
          sendResponse({ 
            ok: false, 
            error: error.message,
            requiresAuth: error.message.includes('authentication')
          });
        }
        return true;
      }

      // If we get here, the message type is not recognized
      sendResponse({
        ok: false,
        error: `Unknown message type: ${message?.type}`
      });
    } catch (error) {
      console.error("Unexpected error in message handler:", error);
      sendResponse({
        ok: false,
        error: error.message || "An unexpected error occurred"
      });
    }
  })();

  // Keep the message channel open for async sendResponse
  return true;
});
