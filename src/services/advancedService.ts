import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Post, UserProfile } from "@/types";
import { buildSearchTokens } from "@/lib/utils";

// ─── Save / Unsave Post ───────────────────────────────────────────────────────
export async function toggleSavePost(userId: string, postId: string): Promise<boolean> {
  const saveRef = doc(db, "savedPosts", `${userId}_${postId}`);
  const snap    = await getDoc(saveRef);
  if (snap.exists()) {
    await deleteDoc(saveRef);
    return false;
  }
  await setDoc(saveRef, { userId, postId, createdAt: serverTimestamp() });
  return true;
}

export async function isPostSaved(userId: string, postId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "savedPosts", `${userId}_${postId}`));
  return snap.exists();
}

export async function getSavedPosts(userId: string): Promise<string[]> {
  const q    = query(collection(db, "savedPosts"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().postId as string);
}

// ─── Report content ───────────────────────────────────────────────────────────
export async function reportContent(data: {
  reporterId:  string;
  targetId:    string;
  targetType:  "post" | "comment" | "user";
  reason:      string;
}): Promise<void> {
  await addDoc(collection(db, "reports"), {
    ...data,
    status:    "pending",
    createdAt: serverTimestamp(),
  });
}

// ─── Block / Unblock user ─────────────────────────────────────────────────────
export async function toggleBlock(myUid: string, theirUid: string): Promise<boolean> {
  const blockRef = doc(db, "blocks", `${myUid}_${theirUid}`);
  const snap     = await getDoc(blockRef);
  if (snap.exists()) {
    await deleteDoc(blockRef);
    return false; // unblocked
  }
  await setDoc(blockRef, { blockerId: myUid, blockedId: theirUid, createdAt: serverTimestamp() });
  return true; // blocked
}

export async function isBlocked(myUid: string, theirUid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "blocks", `${myUid}_${theirUid}`));
  return snap.exists();
}

// ─── Follow / Unfollow (for public pages) ────────────────────────────────────
export async function toggleFollow(myUid: string, targetUid: string): Promise<boolean> {
  const followRef = doc(db, "follows", `${myUid}_${targetUid}`);
  const snap      = await getDoc(followRef);
  if (snap.exists()) {
    await deleteDoc(followRef);
    return false;
  }
  await setDoc(followRef, { followerId: myUid, followingId: targetUid, createdAt: serverTimestamp() });
  return true;
}

// ─── Hashtag helpers ──────────────────────────────────────────────────────────
export function parseHashtags(text: string): string[] {
  const matches = text.match(/#[\u0980-\u09FFa-zA-Z0-9_]+/g) ?? [];
  return [...new Set(matches.map((t) => t.toLowerCase()))];
}

export function renderWithHashtags(text: string): { type: "text" | "hashtag"; value: string }[] {
  const parts = text.split(/(#[\u0980-\u09FFa-zA-Z0-9_]+)/g);
  return parts.map((part) => ({
    type:  part.startsWith("#") ? "hashtag" : "text",
    value: part,
  }));
}

// ─── Phase 4: Backfill searchTokens for existing users ───────────────────────
// Call this once per session for the logged-in user.
// It's idempotent: if searchTokens already matches the current name/username,
// it skips the write.
export async function backfillSearchTokens(uid: string): Promise<void> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;

    const data         = snap.data() as UserProfile;
    const freshTokens  = buildSearchTokens(data.displayName, data.username);
    const storedTokens: string[] = data.searchTokens ?? [];

    // Skip if tokens already present and count matches (avoid unnecessary writes)
    if (
      storedTokens.length === freshTokens.length &&
      freshTokens.every((t) => storedTokens.includes(t))
    ) return;

    await updateDoc(doc(db, "users", uid), { searchTokens: freshTokens });
  } catch (err) {
    // Non-critical — silently ignore so app startup is never blocked
    console.error("backfillSearchTokens failed:", err);
  }
}
export async function searchByHashtag(tag: string): Promise<(Post & { id: string })[]> {
  const normalised = tag.startsWith("#") ? tag.toLowerCase() : `#${tag.toLowerCase()}`;
  const q = query(
    collection(db, "posts"),
    where("hashtags",   "array-contains", normalised),
    where("visibility", "==",             "public"),
    orderBy("createdAt", "desc"),
    limit(30)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post & { id: string }));
}
