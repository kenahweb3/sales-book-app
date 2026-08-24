// Paste your own Firebase project config here.
// See README.md — "Step 1: Create your free Firebase project" for how to get these values.

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE",
};

import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Lets the app keep working with no internet: reads come from a local
// cache, and anything saved offline is queued and synced automatically
// the moment the phone reconnects.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    // Happens if the app is open in more than one browser tab at once —
    // offline mode only works in a single tab at a time.
    console.warn("Offline mode only works in one open tab at a time.");
  } else if (err.code === "unimplemented") {
    console.warn("This browser doesn't support offline mode.");
  }
});
