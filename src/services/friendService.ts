import {
  collection,
  doc,
  addDoc,
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
  // Check if already exists
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

  // Update request status
  batch.update(reqRef, { status: "accepted" });

  // Create friendship (sorted so user1 < user2 — prevents duplicates)
  const [user1, user2] = [senderId, receiverId].sort();
  const friendshipRef  = doc(collection(db, "friendships"));
  batch.set(friendshipRef, { user1, user2, createdAt: serverTimestamp() });

  // Increment friendsCount for both
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
export async function getFriends(
  uid: string,
  pageSize = 20,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ friends: UserProfile[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints: any[] = [
    where("user1", "==", uid),
    orderBy("createdAt", "desc"),
    limit(pageSize),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const q1 = query(collection(db, "friendships"), ...constraints);

  const constraints2: any[] = [
    where("user2", "==", uid),
    orderBy("createdAt", "desc"),
    limit(pageSize),
  ];
  if (lastDoc) constraints2.push(startAfter(lastDoc));

  const q2 = query(collection(db, "friendships"), ...constraints2);

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const allDocs        = [...snap1.docs, ...snap2.docs];

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
    friends: profiles.filter(Boolean) as UserProfile[],
    lastDoc:  allDocs.at(-1) ?? null,
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

  // Check friendship
  const [u1, u2] = [myUid, theirUid].sort();
  const fSnap    = await getDocs(
    query(collection(db, "friendships"), where("user1", "==", u1), where("user2", "==", u2))
  );
  if (!fSnap.empty) return { status: "friends" };

  // Check sent request
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

  // Check received request
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

  // Firestore prefix search on username
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
  const [myFriends, theirFriends] = await Promise.all([
    getFriends(myUid),
    getFriends(theirUid),
  ]);
  const mySet = new Set(myFriends.friends.map((f) => f.uid));
  return theirFriends.friends.filter((f) => mySet.has(f.uid)).length;
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
