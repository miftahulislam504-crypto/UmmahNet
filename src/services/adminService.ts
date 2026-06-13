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

// ─── Search users by email or username ────────────────────────────────────────
export async function adminSearchUsers(term: string): Promise<UserProfile[]> {
  const t = term.toLowerCase().trim();
  if (!t) return getAllUsers();

  const q = query(
    collection(db, "users"),
    where("username", ">=", t),
    where("username", "<=", t + "\uf8ff"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserProfile);
}

// ─── Ban / Unban user ─────────────────────────────────────────────────────────
export async function setBanStatus(uid: string, banned: boolean): Promise<void> {
  await updateDoc(doc(db, "users", uid), { isBlocked: banned });
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

// ─── Check if current user is admin ──────────────────────────────────────────
export async function isAdmin(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}
