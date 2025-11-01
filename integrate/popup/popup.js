// Import the AuthService using dynamic import
(async () => {
  // Load the AuthService module
  const { AuthService } = await import(chrome.runtime.getURL('utils/auth.js'));

  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', async () => {
    const signinBtn = document.getElementById('signinBtn');
    const signoutBtn = document.getElementById('signoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const statusMessage = document.getElementById('statusMessage');
    const suggestMapsBtn = document.getElementById('suggestMaps');

    // Check if user is already signed in
    async function checkAuth() {
      try {
        const token = await AuthService.getToken(false).catch(() => null);
        if (token) {
          const user = await AuthService.getUserInfo(token);
          updateUI(true, user);
        } else {
          updateUI(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        updateUI(false);
      }
    }

    // Update UI based on auth state
    function updateUI(isSignedIn, user = null) {
      if (isSignedIn && user) {
        // User is signed in
        signinBtn.style.display = 'none';
        signoutBtn.style.display = 'block';
        userInfo.style.display = 'block';
        
        // Update user info
        userName.textContent = user.name || 'User';
        userEmail.textContent = user.email || '';
        if (user.picture) {
          userAvatar.src = user.picture;
        }
      } else {
        // User is signed out
        signinBtn.style.display = 'block';
        signoutBtn.style.display = 'none';
        userInfo.style.display = 'none';
      }
    }

    // Show status message
    function showStatus(message, isError = false) {
      statusMessage.textContent = message;
      statusMessage.className = `status ${isError ? 'error' : 'success'}`;
      statusMessage.style.display = 'block';
      
      // Hide message after 3 seconds
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, 3000);
    }

    // Sign in button click handler
    signinBtn.addEventListener('click', async () => {
      try {
        const token = await AuthService.getToken(true);
        const user = await AuthService.getUserInfo(token);
        updateUI(true, user);
        showStatus('Successfully signed in!');
      } catch (error) {
        console.error('Sign in failed:', error);
        showStatus(`Sign in failed: ${error.message}`, true);
      }
    });

    // Sign out button click handler
    signoutBtn.addEventListener('click', async () => {
      try {
        await AuthService.removeCachedAuthToken();
        updateUI(false);
        showStatus('Successfully signed out');
      } catch (error) {
        console.error('Sign out failed:', error);
        showStatus('Sign out failed', true);
      }
    });

    // Handle the maps button click
    suggestMapsBtn.addEventListener('click', async () => {
      try {
        // Check if user is authenticated
        const token = await AuthService.getToken(false).catch(() => null);
        if (!token) {
          showStatus('Please sign in first', true);
          return;
        }
        
        // Your existing maps functionality here
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          console.log('Current URL is: ' + tabs[0].url);
          // Add your maps functionality here
        });
        
      } catch (error) {
        console.error('Error in maps functionality:', error);
        showStatus('Error: ' + error.message, true);
      }
    });

    // Check auth state when popup opens
    checkAuth();
  });
})();