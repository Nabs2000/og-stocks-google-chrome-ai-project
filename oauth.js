window.onload = function() {
  document.querySelector('button').addEventListener('click', async function() {
    try {
      // Request the OAuth token
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken(
          { interactive: true },
          (token) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (!token) {
              reject(new Error('Failed to retrieve token'));
            } else {
              resolve(token);
            }
          }
        );
      });
      
      console.log('Successfully retrieved OAuth token:', token);
      // You can now use this token to make authenticated API calls
      
    } catch (error) {
      console.error('OAuth Error:', error);
      alert('Authentication failed: ' + error.message);
    }
  });
};