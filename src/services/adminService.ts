import {
  collection,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
  serverTimestamp,
  increment,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { UserProfile } from "@/types";

// ─── Platform stats ───────────────────────────────────────────────────────────
export async function getPlatformStats() {
  const [users, posts, reports] = await Promise.all([
    getCountFromServer(collection(db, "users")),
    getCountFromServer(collection(db, "posts")),
    getCountFromServer(query(collection(db, "reports"), where("status", "==", "pending"))),
  ]);
  return {
    totalUsers:    users.data().count,
    totalPosts:    posts.data().count,
    pendingReports: reports.data().count,
  };
}

// ─── Get all users (paginated) ────────────────────────────────────────────────
export async function getAllUsers(pageSize = 20): Promise<UserProfile[]> {
  const q    = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserProfile);
}

// ─── Search users by name or username (admin) ─────────────────────────────────
// PHASE 6 FIX: previously this only prefix-matched the Latin `username`
// field (where("username",">=",t)...<=t+"\uf8ff"), so an admin could never
// find a user by their Bengali displayName — the exact bug Phase 4 fixed
// for regular search. Now mirrors that fix via `searchTokens`.
// Unlike the regular searchUsers(), banned accounts are NOT filtered out —
// admins need to find and manage them.
export async function adminSearchUsers(term: string): Promise<UserProfile[]> {
  const raw = term.toLowerCase().trim();
  if (!raw) return getAllUsers();

  const words = raw.split(/[\s\u200B_.\-]+/).filter(Boolean);
  const token = words[0];
  const rest  = words.slice(1);

  const q = query(
    collection(db, "users"),
    where("searchTokens", "array-contains", token),
    limit(30)
  );
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => d.data() as UserProfile)
    .filter((u) => {
      if (rest.length === 0) return true;
      const haystack = (u.displayName + " " + u.username).toLowerCase();
      return rest.every((w) => haystack.includes(w));
    })
    .slice(0, 20);
}

// ─── Ban / Unban user ─────────────────────────────────────────────────────────
// PHASE 6 FIX: previously this only flipped `users/{uid}.isBlocked` — which
// had ZERO effect anywhere else (no UI checked it, no rule enforced it, the
// feed kept showing their posts). Now:
//   1. firestore.rules' isBannedSelf() blocks the user from creating new
//      posts/comments/likes/stories/messages/friend requests while banned.
//   2. Every existing post by this user gets `authorBanned` stamped, so
//      getPublicFeed/subscribeToFeed can filter them out of the feed
//      (and unset again on unban).
export async function setBanStatus(uid: string, banned: boolean): Promise<void> {
  await updateDoc(doc(db, "users", uid), { isBlocked: banned });

  const postsSnap = await getDocs(
    query(collection(db, "posts"), where("authorId", "==", uid))
  );
  const docs = postsSnap.docs;
  // Chunk to stay safely under Firestore's 500-writes-per-batch limit.
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { authorBanned: banned }));
    await batch.commit();
  }
}

// ─── Get pending reports ──────────────────────────────────────────────────────
export interface Report {
  id:          string;
  reporterId:  string;
  targetId:    string;
  targetType:  string;
  reason:      string;
  status:      "pending" | "resolved" | "dismissed";
  createdAt:   any;
}

export async function getPendingReports(): Promise<Report[]> {
  const q    = query(
    collection(db, "reports"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report));
}

// ─── Resolve / Dismiss report ─────────────────────────────────────────────────
export async function resolveReport(
  reportId: string,
  action:   "resolved" | "dismissed"
): Promise<void> {
  await updateDoc(doc(db, "reports", reportId), { status: action });
}

// ─── Delete post (admin) ──────────────────────────────────────────────────────
export async function adminDeletePost(postId: string): Promise<void> {
  const batch   = writeBatch(db);
  const postSnap = await getDoc(doc(db, "posts", postId));
  if (!postSnap.exists()) return;

  batch.delete(doc(db, "posts", postId));
  batch.update(doc(db, "users", postSnap.data().authorId), {
    postsCount: (postSnap.data().postsCount ?? 1) - 1,
  });
  await batch.commit();
}

// ─── Delete comment (admin) ────────────────────────────────────────────────────
// PHASE 6: previously "comment" reports had no action at all besides
// Resolve/Dismiss — there was no way to actually remove the reported
// comment. Mirrors adminDeletePost: looks up the comment's postId itself
// (the report doc only stores the comment's id as `targetId`).
export async function adminDeleteComment(commentId: string): Promise<void> {
  const commentSnap = await getDoc(doc(db, "comments", commentId));
  if (!commentSnap.exists()) return;
  const { postId } = commentSnap.data() as { postId: string };

  const batch = writeBatch(db);
  batch.delete(doc(db, "comments", commentId));
  batch.update(doc(db, "posts", postId), { commentsCount: increment(-1) });
  await batch.commit();
}

// ─── Check if current user is admin ──────────────────────────────────────────
export async function isAdmin(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}
