let lastTask = null;

async function ensureModel() {
  // Make sure built-in model is available; may trigger on-device download after user interaction
  const avail = await LanguageModel.availability();
  if (avail === 'unavailable') throw new Error('AI model unavailable on this device.');
  // Download/instantiate once per session (shows progress in DevTools)
  return await LanguageModel.create({
    responseConstraint: {
      type: "object",
      properties: {
        title: { type: "string" },
        notes: { type: "string" },
        due:   { type: "string", description: "RFC3339 date or empty if none" },
        listHint: { type: "string", description: "optional task list name" }
      },
      required: ["title"],
      additionalProperties: false
    }
  });
}

document.getElementById('draft').addEventListener('click', async () => {
  const raw = document.getElementById('raw').value.trim();
  try {
    const session = await ensureModel();
    const prompt = `
Extract a Google Task from the input.
- Title: concise imperative.
- Notes: include key details (who/where/context/URL).
- Due: RFC3339 if a concrete time appears (else empty).
- listHint: short name if a list is implied (e.g., "School", "Work").

Input:
${raw}
    `.trim();

    const resultText = await session.prompt(prompt);
    const task = JSON.parse(resultText); // thanks to responseConstraint
    lastTask = task;

    document.getElementById('preview').textContent =
      `Draft:\nTitle: ${task.title}\nDue: ${task.due || '—'}\nNotes: ${task.notes || '—'}\nList: ${task.listHint || 'Default'}`;
    document.getElementById('save').disabled = false;
  } catch (e) {
    document.getElementById('preview').textContent = `AI error: ${e.message}`;
  }
});

document.getElementById('save').addEventListener('click', async () => {
  if (!lastTask) return;
  // Delegate to background to use chrome.identity and call the Tasks API
  chrome.runtime.sendMessage({ type: 'SAVE_TASK', task: lastTask }, (resp) => {
    document.getElementById('preview').textContent =
      resp?.ok ? `Saved! Task id: ${resp.id}` : `Save failed: ${resp?.error || 'unknown'}`;
  });
});
