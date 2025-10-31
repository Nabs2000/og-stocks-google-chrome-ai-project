


  document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('oauth').addEventListener('click', async function() {
    console.log("clicked");
    try {
      // Request the OAuth token
      const token = await new Promise((resolve, reject) => {
        console.log("inside promise");
        chrome.identity.getAuthToken(
          { interactive: true },
          (token) => {
            console.log("Iniside the anonymous")
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
  });
