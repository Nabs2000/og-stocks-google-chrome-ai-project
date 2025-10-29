document.addEventListener("mouseup", () => {
    const text = window.getSelection().toString().trim();
    if (text.length > 0) {
        console.log("User highlighted: ", text);
        chrome.runtime.sendMessage({ type: "TEXT_SELECTED", text });
    }
});