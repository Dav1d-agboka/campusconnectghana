/*
  Campus Connect Ghana — shared auth module
  ------------------------------------------
  This is a CLIENT-SIDE demo authentication store. It uses the browser's
  localStorage as a stand-in "database" so that only people who have actually
  registered (with a password, or via Google) can log in — no more accepting
  any email/password combo.

  IMPORTANT — read before going to production:
  This is fine for a prototype/demo, but it is NOT secure production
  authentication:
    - Everything lives in the visitor's own browser (localStorage), not on
      a server, so there's no real access control between users/devices.
    - Passwords are hashed (SHA-256 + per-user salt) before storage rather
      than kept in plain text, but that hashing happens in the browser,
      which a real attacker could bypass entirely.
  For a real launch, replace CCG_AUTH's internals with calls to a real
  backend (e.g. Node/Express + Postgres, or Firebase Auth) that hashes
  passwords server-side (bcrypt/argon2) and issues real session tokens.
  Every page below only talks to this module, so swapping it out later
  means editing this one file, not every page.
*/

const CCG_AUTH = (function () {
  const USERS_KEY = 'ccg_users';
  const SESSION_KEY = 'ccg_session';

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function bufToHex(buf) {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    return bufToHex(digest);
  }
  function randomToken() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return bufToHex(arr.buffer);
  }

  async function register({ name, email, phone, level, password, provider }) {
    email = (email || '').trim().toLowerCase();
    if (!email) return { ok: false, error: 'An email address is required.' };
    const users = getUsers();
    if (users[email]) {
      return { ok: false, error: 'An account with this email already exists. Try logging in instead.' };
    }
    const record = {
      name: name || '',
      email,
      phone: phone || '',
      level: level || '',
      provider: provider || 'password',
      verified: provider === 'google',
      createdAt: Date.now(),
    };
    if (provider !== 'google') {
      const salt = randomToken();
      record.salt = salt;
      record.hash = await sha256(salt + password);
    }
    users[email] = record;
    saveUsers(users);
    return { ok: true, user: record };
  }

  async function login(email, password) {
    email = (email || '').trim().toLowerCase();
    const users = getUsers();
    const user = users[email];
    if (!user) {
      return { ok: false, error: 'No account found with that email. Create an account first.' };
    }
    if (user.provider === 'google') {
      return { ok: false, error: 'This account signs in with Google. Use "Continue with Google" instead.' };
    }
    const hash = await sha256(user.salt + password);
    if (hash !== user.hash) {
      return { ok: false, error: 'Incorrect password. Try again or reset your password.' };
    }
    setSession(email);
    return { ok: true, user };
  }

  // Called after a real Google Identity Services sign-in returns a verified
  // email + name. First-time Google users are auto-registered (Google has
  // already confirmed the email is real), returning users are just logged in.
  async function loginWithGoogle({ email, name }) {
    email = (email || '').trim().toLowerCase();
    if (!email) return { ok: false, error: 'Google did not return an email address.' };
    const users = getUsers();
    if (!users[email]) {
      const res = await register({ name, email, provider: 'google' });
      if (!res.ok) return res;
    } else if (users[email].provider !== 'google') {
      // An account already exists with a password for this email —
      // link the two rather than silently overwriting the password login.
      users[email].provider = users[email].provider; // keep as 'password'
      saveUsers(users);
    }
    setSession(email);
    return { ok: true, user: getUsers()[email] };
  }

  function setSession(email) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email, at: Date.now() }));
  }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch (e) { return null; }
  }
  function currentUser() {
    const s = getSession();
    if (!s) return null;
    return getUsers()[s.email] || null;
  }
  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  // Drop this at the top of any page that should be members-only.
  // Redirects to login if nobody's signed in, and returns the user record.
  function requireLogin(redirectTo) {
    const user = currentUser();
    if (!user) {
      window.location.href = redirectTo || 'campus-connect-ghana-login.html';
      return null;
    }
    return user;
  }

  async function markVerified(email) {
    email = (email || '').trim().toLowerCase();
    const users = getUsers();
    if (users[email]) {
      users[email].verified = true;
      saveUsers(users);
    }
  }

  // Step 1 of "forgot password": issue a reset token if the email exists.
  // Always returns ok:true to the UI regardless, so the page can't be used
  // to probe which emails are registered.
  async function requestPasswordReset(email) {
    email = (email || '').trim().toLowerCase();
    const users = getUsers();
    if (users[email] && users[email].provider !== 'google') {
      users[email].resetToken = randomToken();
      saveUsers(users);
    }
    return { ok: true };
  }

  async function resetPassword(email, newPassword) {
    email = (email || '').trim().toLowerCase();
    const users = getUsers();
    const user = users[email];
    if (!user || user.provider === 'google') {
      return { ok: false, error: 'No password account found for that email.' };
    }
    const salt = randomToken();
    user.salt = salt;
    user.hash = await sha256(salt + newPassword);
    delete user.resetToken;
    saveUsers(users);
    return { ok: true };
  }

  return {
    register, login, loginWithGoogle,
    getSession, currentUser, logout, requireLogin,
    markVerified, requestPasswordReset, resetPassword,
  };
})();
