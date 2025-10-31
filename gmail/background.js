chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TEXT_SELECTED") {
    sendResponse({ status: "ok" });
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: "highlightAction",
    title: "Generate Email with AI",
    contexts: ["selection"],
  });
});

async function draftEmailWithAI(selectedText) {
  const getSubjectFromText = (text) => {
    const subjectRegex = /Subject:\s+(.*)/;
    if (subjectRegex.test(text)) {
      const subject = subjectRegex.exec(text);
      console.log("Subject line found in text: ", subject[1].trim());
      return subject[1].trim();
    }
    console.log("No subject line found in text.");
    return "";
  };

  const removeSubjectFromText = (text) => {
    const lines = text.split("\n");
    lines.shift();
    return lines.join("\n").trim();
  };

  const openGmailCompose = (subject, body) => {
    const emailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=''&su=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.open(emailLink, "_blank");
  };

  if ("Writer" in self) {
    const writerOptions = {
      shardContext: "This is an email based on the highlighted text.",
      tone: "formal",
      format: "plain-text",
      length: "medium",
    };

    try {
      let writer = null;
      console.log("Writer API is available.");
      const availability = await Writer.availability();
      console.log("Writer availability: ", availability);
      // Request user activation for downloading the model if needed
      if (availability == "downloadable" && navigator.userActivation.isActive) {
        writer = await Writer.create({
          ...writerOptions,
          monitor(m) {
            m.addEventListener("downloadprogress", (e) => {
              console.log(`Downloaded ${e.loaded * 100}%`);
            });
          },
        });
        console.log("Writer instance created after download: ", writer);
      } else if (availability === "available") {
        writer = await Writer.create(writerOptions);
        console.log("Writer instance created: ", writer);
      } else {
        alert("Writer API is not available at the moment.");
      }
      if (writer) {
        // Show spinner in content script
        const email = await writer.write(
          "Compose a professional email based on the following text: " +
            selectedText
        );

        const subject = getSubjectFromText(email);
        const body = removeSubjectFromText(email);
        openGmailCompose(subject, body);
      }
    } catch (error) {
      console.error("Error using Writer API: ", error);
    } finally {
      if (writer) {
        writer.destroy();
      }
    }
  } else {
    console.error("Writer API is not available.");
  }
};

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "highlightAction") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: draftEmailWithAI,
      args: [info.selectionText],
    });
  }
});
