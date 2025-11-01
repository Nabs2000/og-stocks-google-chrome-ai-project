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

async function draftEmailWithAI(selectedText, purpose, tone) {
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
      tone: tone,
      format: "plain-text",
      length: "medium",
    };

    try {
      let writer = null;
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
        const email = await writer.write(
          `Compose an email for the following purpose: ${purpose}. Here is the context:${selectedText}`
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
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "highlightAction") {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["gmail/content.js"],
    });
    chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_POPUP",
      selectedText: info.selectionText,
    });
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "GENERATE_EMAIL") {
    try {
      const { selectedText, purpose, tone } = message;
      console.log("Generating email for purpose:", purpose);
      await chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        func: draftEmailWithAI,
        args: [selectedText, purpose, tone],
      });
      sendResponse({ status: "ok" });
    } finally {
      chrome.tabs.sendMessage(sender.tab.id, { type: "EMAIL_GENERATION_DONE" });
    }
  }
});
