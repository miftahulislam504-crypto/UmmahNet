import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
  increment,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { FriendRequest, Friendship, UserProfile } from "@/types";

// ─── Send Friend Request ───────────────────────────────────────────────────────
export async function sendFriendRequest(
  senderId: string,
  receiverId: string
): Promise<void> {
  const existing = await getFriendRequestBetween(senderId, receiverId);
  if (existing) throw new Error("ALREADY_EXISTS");

  await addDoc(collection(db, "friendRequests"), {
    senderId,
    receiverId,
    status:    "pending",
    createdAt: serverTimestamp(),
  });
}

// ─── Accept Friend Request ─────────────────────────────────────────────────────
export async function acceptFriendRequest(requestId: string): Promise<void> {
  const reqRef  = doc(db, "friendRequests", requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error("NOT_FOUND");

  const { senderId, receiverId } = reqSnap.data() as FriendRequest;
  const batch = writeBatch(db);

  batch.update(reqRef, { status: "accepted" });

  const [user1, user2] = [senderId, receiverId].sort();
  // PHASE 12: deterministic id (user1_user2) so firestore.rules can check
  // "is X my friend" via exists() without running a query.
  const friendshipRef  = doc(db, "friendships", `${user1}_${user2}`);
  batch.set(friendshipRef, { user1, user2, createdAt: serverTimestamp() });

  batch.update(doc(db, "users", senderId),   { friendsCount: increment(1) });
  batch.update(doc(db, "users", receiverId), { friendsCount: increment(1) });

  await batch.commit();
}

// ─── Reject / Cancel Request ───────────────────────────────────────────────────
export async function rejectFriendRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, "friendRequests", requestId));
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, "friendRequests", requestId));
}

// ─── Unfriend ─────────────────────────────────────────────────────────────────
export async function unfriend(myUid: string, friendUid: string): Promise<void> {
  const [user1, user2] = [myUid, friendUid].sort();

  const q    = query(
    collection(db, "friendships"),
    where("user1", "==", user1),
    where("user2", "==", user2)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  batch.update(doc(db, "users", myUid),     { friendsCount: increment(-1) });
  batch.update(doc(db, "users", friendUid), { friendsCount: increment(-1) });
  await batch.commit();
}

// ─── Get Pending Requests (received) ──────────────────────────────────────────
export async function getPendingRequests(uid: string): Promise<
  (FriendRequest & { id: string; senderProfile: UserProfile | null })[]
> {
  const q    = query(
    collection(db, "friendRequests"),
    where("receiverId", "==", uid),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);

  return Promise.all(
    snap.docs.map(async (d) => {
      const req         = { id: d.id, ...d.data() } as FriendRequest & { id: string };
      const senderSnap  = await getDoc(doc(db, "users", req.senderId));
      const senderProfile = senderSnap.exists()
        ? (senderSnap.data() as UserProfile)
        : null;
      return { ...req, senderProfile };
    })
  );
}

// ─── Get Sent Requests ────────────────────────────────────────────────────────
export async function getSentRequests(uid: string): Promise<
  (FriendRequest & { id: string })[]
> {
  const q    = query(
    collection(db, "friendRequests"),
    where("senderId", "==", uid),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequest & { id: string }));
}

// ─── Get Friend List ──────────────────────────────────────────────────────────
// BUG 5 FIX: previously the same lastDoc was passed to both the user1 and user2 queries.
// But each query has its own cursor — this caused incorrect pagination.
// Fix: each query now tracks its own lastDoc.
export async function getFriends(
  uid: string,
  pageSize = 20,
  lastDoc1?: QueryDocumentSnapshot,
  lastDoc2?: QueryDocumentSnapshot
): Promise<{
  friends: UserProfile[];
  lastDoc1: QueryDocumentSnapshot | null;
  lastDoc2: QueryDocumentSnapshot | null;
}> {
  const c1: any[] = [
    where("user1", "==", uid),
    orderBy("createdAt", "desc"),
    limit(pageSize),
  ];
  if (lastDoc1) c1.push(startAfter(lastDoc1));

  const c2: any[] = [
    where("user2", "==", uid),
    orderBy("createdAt", "desc"),
    limit(pageSize),
  ];
  if (lastDoc2) c2.push(startAfter(lastDoc2));

  const [snap1, snap2] = await Promise.all([
    getDocs(query(collection(db, "friendships"), ...c1)),
    getDocs(query(collection(db, "friendships"), ...c2)),
  ]);

  const allDocs = [...snap1.docs, ...snap2.docs];

  const friendIds = allDocs.map((d) => {
    const { user1, user2 } = d.data() as Friendship;
    return user1 === uid ? user2 : user1;
  });

  const profiles = await Promise.all(
    friendIds.map(async (fid) => {
      const snap = await getDoc(doc(db, "users", fid));
      return snap.exists() ? (snap.data() as UserProfile) : null;
    })
  );

  return {
    friends:  profiles.filter(Boolean) as UserProfile[],
    lastDoc1: snap1.docs.at(-1) ?? null,
    lastDoc2: snap2.docs.at(-1) ?? null,
  };
}

// ─── Check Relationship Status ────────────────────────────────────────────────
export type RelationStatus =
  | "none"
  | "friends"
  | "request_sent"
  | "request_received"
  | "self";

export async function getRelationStatus(
  myUid: string,
  theirUid: string
): Promise<{ status: RelationStatus; requestId?: string }> {
  if (myUid === theirUid) return { status: "self" };

  const [u1, u2] = [myUid, theirUid].sort();
  const fSnap    = await getDocs(
    query(collection(db, "friendships"), where("user1", "==", u1), where("user2", "==", u2))
  );
  if (!fSnap.empty) return { status: "friends" };

  const sentSnap = await getDocs(
    query(
      collection(db, "friendRequests"),
      where("senderId",   "==", myUid),
      where("receiverId", "==", theirUid),
      where("status",     "==", "pending")
    )
  );
  if (!sentSnap.empty)
    return { status: "request_sent", requestId: sentSnap.docs[0].id };

  const recvSnap = await getDocs(
    query(
      collection(db, "friendRequests"),
      where("senderId",   "==", theirUid),
      where("receiverId", "==", myUid),
      where("status",     "==", "pending")
    )
  );
  if (!recvSnap.empty)
    return { status: "request_received", requestId: recvSnap.docs[0].id };

  return { status: "none" };
}

// ─── Search Users ─────────────────────────────────────────────────────────────
export async function searchUsers(
  searchTerm: string,
  currentUid: string
): Promise<UserProfile[]> {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return [];

  const q = query(
    collection(db, "users"),
    where("username", ">=", term),
    where("username", "<=", term + "\uf8ff"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as UserProfile)
    .filter((u) => u.uid !== currentUid);
}

// ─── Get Mutual Friends Count ─────────────────────────────────────────────────
export async function getMutualFriendsCount(
  myUid: string,
  theirUid: string
): Promise<number> {
  const [myData, theirData] = await Promise.all([
    getFriends(myUid),
    getFriends(theirUid),
  ]);
  const mySet = new Set(myData.friends.map((f) => f.uid));
  return theirData.friends.filter((f) => mySet.has(f.uid)).length;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getFriendRequestBetween(
  uid1: string,
  uid2: string
): Promise<string | null> {
  const q = query(
    collection(db, "friendRequests"),
    where("senderId",   "==", uid1),
    where("receiverId", "==", uid2),
    where("status",     "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].id;
}

// ─── Migrate legacy friendship doc ids (PHASE 12) ──────────────────────────────
// Older friendships were created with auto-generated ids. The new friends-only
// story rules check friendship via exists() on a deterministic
// `friendships/{u1}_{u2}` doc, which only exists for friendships made AFTER
// this change. This backfills a matching deterministic doc for every existing
// friendship of `uid` (idempotent — safe to call every session, e.g. from
// useStories on mount).
export async function migrateLegacyFriendships(uid: string): Promise<void> {
  try {
    const { friends } = await getFriends(uid, 100);
    await Promise.all(
      friends.map(async (f) => {
        const [user1, user2] = [uid, f.uid].sort();
        const ref  = doc(db, "friendships", `${user1}_${user2}`);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { user1, user2, createdAt: serverTimestamp() });
        }
      })
    );
  } catch (err) {
    console.error("migrateLegacyFriendships failed:", err);
  }
}
