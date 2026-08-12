/*
  Wires a custom-styled "Continue with Google" button to real Google
  Identity Services sign-in.

  Include this after:
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <script src="campus-connect-ghana-config.js"></script>
    <script src="campus-connect-ghana-auth.js"></script>
  then call setupGoogleButton('.btn-google') once the button exists in the DOM.

  Until CCG_CONFIG.GOOGLE_CLIENT_ID is filled in (see that file), clicking
  the button shows a friendly reminder instead of failing silently.
*/
function ccgDecodeJwt(token) {
  const payload = token.split('.')[1];
  const json = decodeURIComponent(
    atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(json);
}

function ccgGoogleConfigured() {
  return typeof CCG_CONFIG !== 'undefined' &&
    CCG_CONFIG.GOOGLE_CLIENT_ID.indexOf('YOUR_GOOGLE_CLIENT_ID') === -1;
}

async function ccgHandleGoogleCredential(response) {
  const data = ccgDecodeJwt(response.credential);
  const res = await CCG_AUTH.loginWithGoogle({ email: data.email, name: data.name });
  if (res.ok) {
    window.location.href = 'campus-connect-ghana-dashboard.html';
  } else {
    alert(res.error || 'Google sign-in failed. Please try again.');
  }
}

function setupGoogleButton(triggerSelector) {
  const trigger = document.querySelector(triggerSelector);
  if (!trigger) return;

  if (!ccgGoogleConfigured()) {
    trigger.addEventListener('click', function () {
      alert('Google Sign-In isn\'t set up yet.\n\nAdd your Google OAuth Client ID to campus-connect-ghana-config.js to enable this button — see the comments in that file for how to get one.');
    });
    return;
  }

  function init() {
    if (!window.google || !window.google.accounts) { setTimeout(init, 200); return; }
    google.accounts.id.initialize({
      client_id: CCG_CONFIG.GOOGLE_CLIENT_ID,
      callback: ccgHandleGoogleCredential,
    });

    // Google's branding guidelines require using their real button to
    // trigger sign-in. We render it off-screen and forward clicks from
    // our own styled button to it, so the visible design stays unchanged.
    const hidden = document.createElement('div');
    hidden.id = 'ccg-g-hidden';
    hidden.style.cssText = 'position:absolute; opacity:0; pointer-events:none; height:0; width:0; overflow:hidden;';
    document.body.appendChild(hidden);
    google.accounts.id.renderButton(hidden, { type: 'standard' });

    trigger.addEventListener('click', function () {
      const realBtn = hidden.querySelector('div[role="button"]');
      if (realBtn) realBtn.click();
    });
  }
  init();
}
