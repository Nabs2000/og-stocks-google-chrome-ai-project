// Simple helper to GET/POST with bearer token
async function authedFetch(path, token, init={}) {
  const base = 'https://tasks.googleapis.com/tasks/v1';
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

// Pick (or create) a tasklist by name; default to "Tasks"
async function getOrCreateListId(token, listHint) {
  const data = await authedFetch('/users/@me/lists', token);
  const found = (data.items || []).find(l => l.title.toLowerCase() === (listHint||'').toLowerCase());
  if (found) return found.id;
  if (!listHint) return (data.items || [])[0]?.id; // default first list
  const created = await authedFetch('/users/@me/lists', token, {
    method: 'POST', body: JSON.stringify({ title: listHint })
  });
  return created.id;
}

// Insert the task
async function insertTask(token, listId, task) {
  const body = {
    title: task.title,
    notes: task.notes || '',
    due: task.due || undefined
  };
  const created = await authedFetch(`/lists/${encodeURIComponent(listId)}/tasks`, token, {
    method: 'POST', body: JSON.stringify(body)
  });
  return created;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg.type !== 'SAVE_TASK') return;

    // Interactive = true shows Google account chooser/consent when needed
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        sendResponse({ ok: false, error: chrome.runtime.lastError?.message || 'No token' });
        return;
      }
      try {
        const listId = await getOrCreateListId(token, msg.task.listHint);
        const task = await insertTask(token, listId, msg.task);
        sendResponse({ ok: true, id: task.id });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    });
  })();
  return true; // keep the message channel open for async response
});
