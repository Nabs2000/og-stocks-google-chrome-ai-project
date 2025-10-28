chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "TEXT_SELECTED") {
        sendResponse({ status: "ok" });
    }
});

chrome.action.onClicked.addListener(function() {
    chrome.tabs.create({ url: "index.html"});
});
