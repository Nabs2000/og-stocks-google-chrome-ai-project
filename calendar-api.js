// background.js

const CALENDAR_EVENTS_URL = 
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin='; // Use 'primary' for the user's main calendar

/**
 * Gets an OAuth token and fetches the list of events from the Calendar API.
 */
function listCalendarEvents() {
    console.log("Calendar click");
    // 1. Get the OAuth token using the Chrome Identity API
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            return;
        }

        // 2. Format the time to request events (e.g., from now onwards)
        const now = new Date();
        const isoNow = now.toISOString();

        // Construct the full API URL, requesting events from the current time
        const fullUrl = `${CALENDAR_EVENTS_URL}${isoNow}&singleEvents=true&orderBy=startTime&maxResults=10`;

        // 3. Make the authenticated Fetch request
        fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` // Use the token for authorization
            }
        })
        .then(response => {
            if (!response.ok) {
                // If the API returns an error status (e.g., 401, 403)
                throw new Error(`API request failed with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 4. Process the data
            console.log("Successfully fetched Calendar Events:");
            data.items.forEach(event => {
                console.log(`- Event: ${event.summary} (${event.start.dateTime || event.start.date})`);
            });
            
            // You would typically send this data to a popup or UI script here
            // e.g., chrome.runtime.sendMessage({ action: "events_ready", events: data.items });
        })
        .catch(error => {
            console.error("Fetch Error:", error);
            // Optionally, remove the invalid token and try again later
            // chrome.identity.removeCachedAuthToken({ token: token }); 
        });
    });
}
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('list-events').addEventListener('click', async function() {
        console.log("Clicked on this");
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === "get_events") {
                listCalendarEvents();
                sendResponse({status: "Fetching started"});
            }
        });
    });
});
