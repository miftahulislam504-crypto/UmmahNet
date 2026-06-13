import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
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

// ─── Session cookie helper ─────────────────────────────────────────────────────
// FIX: Secure flag যোগ করা হয়েছে — production-এ HTTPS ছাড়া cookie set হবে না।
// আগে HTTP-তেও cookie চলে যেত, man-in-the-middle attack possible ছিল।
function setSessionCookie(token: string) {
  const isProduction = process.env.NODE_ENV === "production";
  const secure       = isProduction ? "; Secure" : "";
  document.cookie = `un_session=${token}; path=/; max-age=3600; SameSite=Strict${secure}`;
}

function clearSessionCookie() {
  document.cookie = "un_session=; path=/; max-age=0; SameSite=Strict";
}

// ─── Critical Fix: Session cookie sync ────────────────────────────────────────
// initSessionSync() একটা explicit function —
// শুধু browser-এ, client component mount হওয়ার পর call হবে।
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
        // token fetch ব্যর্থ হলে session clear করো
        clearSessionCookie();
      }
    } else {
      clearSessionCookie();
    }
  });
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
export async function loginWithGoogle(): Promise<User> {
  const { user } = await signInWithPopup(auth, googleProvider);
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    const username = user.email?.split("@")[0] ?? `user_${user.uid.slice(0, 6)}`;
    await createUserDocument(user, { username });
  }
  return user;
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
