// Function to extract locations using AI
async function extractLocationsWithAI(text) {
  try {
    const { defaultTemperature, maxTemperature, defaultTopK, maxTopK } =
      await LanguageModel.params();

    const available = await LanguageModel.available();

    if (available !== "unavailable") {
      const session = await LanguageModel.create({
        initialPrompts: [
          {
            role: "system",
            content:
              'You are a helpful assistant that extracts origin and destination locations from text. Respond with a JSON object containing \'origin\' and \'destination\' fields. If a location can\'t be determined, use null. Example: {"origin":"New York","destination":"Los Angeles"}',
          },
        ],
      });

      const result = await session.prompt(text);
      console.log(result);

      const parsedResult = JSON.parse(result);

      // Validate the response
      if (!parsedResult.origin || !parsedResult.destination) {
        throw new Error(
          "Could not determine both origin and destination from the selected text"
        );
      }

      return parsedResult;
    } else {
      throw new Error(
        "Gemini Nano is not available. Please try again by refreshing the page."
      );
    }
  } catch (error) {
    console.error("AI parsing error:", error);
    throw new Error("Failed to parse locations from text");
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
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "GET_DIRECTIONS") {
      try {
        // First, extract locations using AI
        const { origin, destination } = await extractLocationsWithAI(
          message.text
        );

        // Then get directions
        const directions = await getDirections(origin, destination);
        const route = directions.routes[0];

        // Open Google Maps in a new tab with the directions
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
          origin
        )}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
        chrome.tabs.create({ url: mapsUrl });

        sendResponse({ ok: true });
      } catch (error) {
        console.error("Error:", error);
        sendResponse({
          ok: false,
          error: error.message || "Failed to get directions",
        });
      }
    }
  })();

  // Keep the message channel open for async sendResponse
  return true;
});
