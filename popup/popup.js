document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('suggestMaps');
    
    button.addEventListener('click', () => {
        alert('Hello from your Chrome Extension!');

        // Example of using a Chrome API to get the current tab's URL
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            console.log('Current URL is: ' + tabs[0].url);
        });
    });
});