"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Firebase is loaded lazily by <GoogleButton> so the login / signup pages stay
 * light until someone actually chooses Google. The web config is public by
 * design; the ID token is verified server-side in /api/auth/google.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyCxV4M8m-idNxmR8U1OvClxims7LDDXjYQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "matrix-cf52e.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "https://matrix-cf52e-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "matrix-cf52e",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "matrix-cf52e.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "125521170850",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:125521170850:web:8e522e9981e6465344e2fb",
};

function firebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

let cachedAuth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(firebaseApp());
  return cachedAuth;
}
