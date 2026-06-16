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
  increment,
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
// PHASE 6 FIX: previously this only wrote/deleted a `blocks/{me}_{them}` doc
// with no other effect — blocking someone did nothing visible. Now, on
// BLOCK we also:
//   1. delete any existing friendship between the two users
//      (and decrement both friendsCount values), and
//   2. cancel any pending friend request in either direction,
// so a block actually severs the connection instead of just hiding it.
// Unblock only removes the block doc — it does NOT restore the friendship
// or resend requests (the relationship has to be re-established manually).
export async function toggleBlock(myUid: string, theirUid: string): Promise<boolean> {
  const blockRef = doc(db, "blocks", `${myUid}_${theirUid}`);
  const snap     = await getDoc(blockRef);
  if (snap.exists()) {
    await deleteDoc(blockRef);
    return false; // unblocked
  }

  const [user1, user2]  = [myUid, theirUid].sort();
  const friendshipRef   = doc(db, "friendships", `${user1}_${user2}`);
  const [friendshipSnap, sentReqSnap, recvReqSnap] = await Promise.all([
    getDoc(friendshipRef),
    getDocs(query(
      collection(db, "friendRequests"),
      where("senderId",   "==", myUid),
      where("receiverId", "==", theirUid),
      where("status",     "==", "pending")
    )),
    getDocs(query(
      collection(db, "friendRequests"),
      where("senderId",   "==", theirUid),
      where("receiverId", "==", myUid),
      where("status",     "==", "pending")
    )),
  ]);

  const batch = writeBatch(db);
  batch.set(blockRef, { blockerId: myUid, blockedId: theirUid, createdAt: serverTimestamp() });

  if (friendshipSnap.exists()) {
    batch.delete(friendshipRef);
    batch.update(doc(db, "users", myUid),    { friendsCount: increment(-1) });
    batch.update(doc(db, "users", theirUid), { friendsCount: increment(-1) });
  }
  sentReqSnap.docs.forEach((d) => batch.delete(d.ref));
  recvReqSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();
  return true; // blocked
}

export async function isBlocked(myUid: string, theirUid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "blocks", `${myUid}_${theirUid}`));
  return snap.exists();
}

// ─── Phase 6: hidden relations (for feed/search/profile content-hiding) ──────
// Returns both directions of block relationships involving `uid`:
//   blockedByMe — uids that `uid` has blocked (can be unblocked from settings)
//   blockedMe   — uids that have blocked `uid` (their content should also hide)
// Used to build a combined "hidden" set client-side — no Firestore `not-in`
// query is needed, and the set is normally tiny.
export interface HiddenRelations {
  blockedByMe: string[];
  blockedMe:   string[];
}

export async function getHiddenRelations(uid: string): Promise<HiddenRelations> {
  const [mineSnap, theirsSnap] = await Promise.all([
    getDocs(query(collection(db, "blocks"), where("blockerId", "==", uid))),
    getDocs(query(collection(db, "blocks"), where("blockedId", "==", uid))),
  ]);
  return {
    blockedByMe: mineSnap.docs.map((d) => d.data().blockedId as string),
    blockedMe:   theirsSnap.docs.map((d) => d.data().blockerId as string),
  };
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
