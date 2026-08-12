/*
  Campus Connect Ghana — API keys
  --------------------------------
  Fill in the two values below with your own keys. Nothing else in the
  site needs to change — every page reads from here.

  GOOGLE_CLIENT_ID
    1. Go to https://console.cloud.google.com/apis/credentials
    2. Create an OAuth 2.0 Client ID of type "Web application".
    3. Under "Authorized JavaScript origins", add the URL(s) this site
       will be hosted on (e.g. https://campusconnectgh.com and, while
       testing locally, http://localhost:PORT — Google Sign-In does not
       work on file:// URLs, so serve the site over http/https).
    4. Paste the Client ID below.

  PAYSTACK_PUBLIC_KEY
    1. Go to https://dashboard.paystack.com/#/settings/developer
    2. Copy your Public Key (starts with pk_test_ while in test mode,
       pk_live_ once you're ready to accept real payments).
    3. Paste it below. Never put your Paystack SECRET key in this file
       or anywhere in frontend code — the secret key belongs on a
       server only.
*/
const CCG_CONFIG = {
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  PAYSTACK_PUBLIC_KEY: 'pk_test_YOUR_PAYSTACK_PUBLIC_KEY',
};
