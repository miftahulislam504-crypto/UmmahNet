import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  updateProfile,
  onIdTokenChanged,
  type User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase/config";
import type { UserProfile } from "@/types";

// ─── Session cookie helper ────────────────────────────────────────────────────
function setSessionCookie(token: string) {
  const isProduction = process.env.NODE_ENV === "production";
  const secure       = isProduction ? "; Secure" : "";
  document.cookie = `un_session=${token}; path=/; max-age=3600; SameSite=Strict${secure}`;
}

function clearSessionCookie() {
  document.cookie = "un_session=; path=/; max-age=0; SameSite=Strict";
}

// ─── FIX: Promise that resolves only after the cookie is set ──────────────
// Previously router.push("/") was called as soon as loginWithEmail() finished,
// but onIdTokenChanged is async — the cookie wasn't set yet.
// The middleware found no session and redirected back to /login.
// This function waits until the cookie is actually set.
export function waitForSessionCookie(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();

    const deadline = Date.now() + timeoutMs;

    const check = () => {
      const hasCookie = document.cookie
        .split(";")
        .some((c) => c.trim().startsWith("un_session="));

      if (hasCookie) return resolve();
      if (Date.now() > deadline) return reject(new Error("Session cookie timeout"));
      setTimeout(check, 50);
    };

    check();
  });
}

// ─── Session sync ─────────────────────────────────────────────────────────────
let sessionSyncInitialized = false;

export function initSessionSync(): void {
  if (typeof window === "undefined") return;
  if (sessionSyncInitialized) return;
  sessionSyncInitialized = true;

  onIdTokenChanged(auth, async (user) => {
    if (user) {
      try {
        const token = await user.getIdToken();
        setSessionCookie(token);
      } catch {
        clearSessionCookie();
      }
    } else {
      clearSessionCookie();
    }
  });
}

// ─── FIX: Google Redirect result handle ──────────────────────────────────────
// Mobile browsers block signInWithPopup.
// signInWithRedirect must be used instead, and after the page reloads
// the result is retrieved via getRedirectResult().
export async function handleGoogleRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    const { user } = result;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      const username = user.email?.split("@")[0] ?? `user_${user.uid.slice(0, 6)}`;
      await createUserDocument(user, { username });
    }
    return user;
  } catch {
    return null;
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────
export async function registerWithEmail(
  email:       string,
  password:    string,
  displayName: string,
  username:    string
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await createUserDocument(user, { displayName, username });
  return user;
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function loginWithEmail(
  email:    string,
  password: string
): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

// ─── Google ───────────────────────────────────────────────────────────────────
// Uses a popup on desktop and a redirect on mobile.
export async function loginWithGoogle(): Promise<void> {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // redirect: the page navigates away; handleGoogleRedirectResult() handles it on return
    await signInWithRedirect(auth, googleProvider);
  } else {
    const { user } = await signInWithPopup(auth, googleProvider);
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      const username = user.email?.split("@")[0] ?? `user_${user.uid.slice(0, 6)}`;
      await createUserDocument(user, { username });
    }
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  await signOut(auth);
  if (typeof window !== "undefined") {
    clearSessionCookie();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function createUserDocument(
  user:  User,
  extra: { displayName?: string; username: string }
): Promise<void> {
  const profile = {
    uid:            user.uid,
    username:       extra.username,
    displayName:    extra.displayName ?? user.displayName ?? "",
    email:          user.email ?? "",
    photoURL:       user.photoURL ?? "",
    coverPhoto:     "",
    bio:            "",
    friendsCount:   0,
    postsCount:     0,
    isVerified:     false,
    isBlocked:      false,
    privacySetting: "public",
    createdAt:      serverTimestamp(),
  };
  await setDoc(doc(db, "users", user.uid), profile);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}
