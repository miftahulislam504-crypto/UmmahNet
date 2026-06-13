import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ─── Critical Fix: Validate env vars before initializing ─────────────────────
// On Vercel, a missing env var causes initializeApp to fail silently.
// Now it clearly reports which variable is missing.
const requiredEnvVars = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// During build (SSR/SSG), warn on a missing env var instead of crashing
if (typeof window === "undefined") {
  const missing = Object.entries(requiredEnvVars)
    .filter(([, v]) => !v)
    .map(([k]) => `NEXT_PUBLIC_FIREBASE_${k.replace(/([A-Z])/g, "_$1").toUpperCase()}`);
  if (missing.length > 0) {
    console.warn("[Firebase] Missing env vars:", missing.join(", "));
  }
}

const firebaseConfig = {
  ...requiredEnvVars,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ─── Singleton init ───────────────────────────────────────────────────────────
let app: FirebaseApp;
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch (e) {
  console.error("[Firebase] initializeApp failed:", e);
  // Re-throw so Vercel function log catches it
  throw e;
}

export { app };
export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const storage        = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// ─── Analytics: lazy load, browser-only, never blocks SSR ───────────────────
// Removed the top-level promise — it crashed during SSR.
// Lazy-import it in a component if needed.
export async function getAnalyticsInstance() {
  if (typeof window === "undefined") return null;
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    const supported = await isSupported();
    return supported ? getAnalytics(app) : null;
  } catch {
    return null;
  }
}
