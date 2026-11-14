// Firebase web settings. Get them from: Firebase console → Project settings →
// "Your apps" → Web app → "SDK setup and configuration" → Config.
// These values are meant to be public (they identify the project, they are not a password).
// Your data is protected by firestore.rules, not by hiding this file.
//
// Project: cupidon-uz. Empty apiKey = DEMO MODE: no Google login, and letters are saved
// only in this browser (so the link only opens on this same computer/phone).
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Sites that run Google sign-in on their own address (through the /__/auth proxy in netlify.toml) instead of
// cupidon-uz.firebaseapp.com. This makes the "redirect" sign-in work in browsers that block third-party storage.
// Add a site ONLY after "https://<site>/__/auth/handler" is added in Google Cloud → Credentials → OAuth client
// → Authorized redirect URIs (see README "Google sign-in on our own address"), or sign-in breaks.
export const authOnSite = [];
