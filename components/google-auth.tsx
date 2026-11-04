"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export type GoogleProfile = {
  name?: string;
  mode?: string;
  region?: string;
  dob?: string;
  guardianEmail?: string;
};

type Props = {
  intent: "login" | "signup";
  profile?: GoogleProfile;
  termsAccepted?: boolean;
  requireTerms?: boolean;
  onError?: (message: string) => void;
  label?: string;
};

function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

export function GoogleButton({ intent, profile, termsAccepted, requireTerms, onError, label }: Props) {
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (requireTerms && !termsAccepted) {
      onError?.("Accept the simulation terms to continue with Google.");
      return;
    }
    setBusy(true);
    onError?.("");
    try {
      // Loaded on demand so Firebase never sits in the initial login bundle.
      const [{ GoogleAuthProvider, signInWithPopup, signOut, setPersistence, inMemoryPersistence }, { getFirebaseAuth }] =
        await Promise.all([import("firebase/auth"), import("@/lib/firebase")]);

      const auth = getFirebaseAuth();
      // No silent restore on the next visit: the app session is our own cookie.
      await setPersistence(auth, inMemoryPersistence);

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, intent, profile, termsAccepted: Boolean(termsAccepted) }),
      });
      const data = await res.json().catch(() => ({}));

      // Drop the Firebase session; our own browser-session cookie is the source
      // of truth, so reopening the app still requires signing in again.
      await signOut(auth).catch(() => {});

      if (!res.ok) throw new Error(data.error ?? "Google sign-in failed.");
      window.location.assign(data.redirect ?? "/dashboard");
    } catch (err: any) {
      const code = String(err?.code ?? "");
      const message =
        code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request"
          ? "Google sign-in was closed before it finished."
          : code === "auth/popup-blocked"
            ? "Your browser blocked the Google popup. Allow popups for this site and try again."
            : code === "auth/unauthorized-domain"
              ? "This domain is not authorised in Firebase. Add it to Authentication → Settings → Authorized domains."
              : code === "auth/account-exists-with-different-credential"
                ? "This email already has a password account. Sign in with your password, then link Google from settings."
                : code === "auth/operation-not-allowed"
                ? "Google sign-in is not enabled yet. Turn it on in Firebase Console → Authentication → Sign-in method."
                : code === "auth/network-request-failed"
                  ? "Could not reach Google. Check your connection and try again."
                  : err?.message ?? "Google sign-in failed.";
      onError?.(message);
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={handle} disabled={busy} className="btn btn-dark w-full">
      {busy ? <Loader2 size={15} className="animate-spin" /> : <GoogleMark />}
      {busy ? "Connecting to Google…" : label ?? "Continue with Google"}
    </button>
  );
}
