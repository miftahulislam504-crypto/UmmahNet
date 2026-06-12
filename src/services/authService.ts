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

// ─── Critical Fix: Session cookie sync ────────────────────────────────────────
// আগে এই code টা module-level এ ছিল (top-level if block)।
// Next.js 15 / Vercel-এ server-side module import হওয়ার সময়
// এই code run হত — `auth` object তখন browser API ছাড়া কাজ করে না,
// ফলে silent crash হত এবং পুরো app লোড বন্ধ হয়ে যেত।
//
// Fix: initSessionSync() একটা explicit function —
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
        document.cookie = `un_session=${token}; path=/; max-age=3600; SameSite=Strict`;
      } catch {
        // token fetch ব্যর্থ হলে session clear করো
        document.cookie = "un_session=; path=/; max-age=0";
      }
    } else {
      document.cookie = "un_session=; path=/; max-age=0";
    }
  });
}

// ─── Register ─────────────────────────────────────────────────────────────────
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
  username: string
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await createUserDocument(user, { displayName, username });
  return user;
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function loginWithEmail(
  email: string,
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
    document.cookie = "un_session=; path=/; max-age=0";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function createUserDocument(
  user: User,
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
