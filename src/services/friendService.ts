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
import { buildSearchTokens } from "@/lib/utils";
import { createNotification } from "@/services/notificationService";

// ─── Send Friend Request ───────────────────────────────────────────────────────
export async function sendFriendRequest(
  senderId: string,
  receiverId: string
): Promise<void> {
  const existing = await getFriendRequestBetween(senderId, receiverId);
  if (existing) throw new Error("ALREADY_EXISTS");

  const reqRef = await addDoc(collection(db, "friendRequests"), {
    senderId,
    receiverId,
    status:    "pending",
    createdAt: serverTimestamp(),
  });

  // ── Phase 3: Notify receiver ──────────────────────────────────────────────
  try {
    const senderSnap = await getDoc(doc(db, "users", senderId));
    const senderName = senderSnap.exists()
      ? (senderSnap.data() as UserProfile).displayName
      : "কেউ একজন";
    await createNotification({
      userId:        receiverId,
      type:          "friend_request",
      actorId:       senderId,
      actorName:     senderName,
      referenceId:   reqRef.id,
      referenceType: "friendRequest",
    });
  } catch (err) {
    // Notification failure must never break the main action
    console.error("sendFriendRequest notification failed:", err);
  }
}

// ─── Accept Friend Request ─────────────────────────────────────────────────────
// BUG 2 FIX: previously the batch tried to update BOTH users/{senderId} AND
// users/{receiverId} in one transaction. Firestore rules only allow a user to
// update their OWN document (isOwner(uid)). The batch included an update to
// the sender's doc — permission denied — causing the ENTIRE batch to fail
// silently. The friend request stayed in "pending" and no friendship was created.
//
// Fix: split into two writes:
//   1. A writeBatch that only touches docs the RECEIVER is allowed to write:
//      the friendRequest (update status), the friendship (create), and their
//      OWN users doc (increment their friendsCount).
//   2. A separate updateDoc for the SENDER's friendsCount using a Firestore
//      rule that allows a user to increment another user's friendsCount when
//      a friendship is being accepted. We achieve this by relaxing the users
//      update rule to also allow incrementing friendsCount when a friendship
//      doc between the two users already exists (checked after the batch).
//
// Simpler alternative implemented here: update the sender's count in a second
// write immediately after the batch — this is safe because the friendship doc
// now exists, and we update the Firestore rule to allow any authenticated user
// to increment another user's friendsCount (a non-sensitive counter).
export async function acceptFriendRequest(requestId: string): Promise<void> {
  const reqRef  = doc(db, "friendRequests", requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error("NOT_FOUND");

  const { senderId, receiverId } = reqSnap.data() as FriendRequest;
  const [user1, user2] = [senderId, receiverId].sort();
  const friendshipRef  = doc(db, "friendships", `${user1}_${user2}`);

  // Batch 1: things the RECEIVER (current user) can write
  const batch = writeBatch(db);
  batch.update(reqRef,      { status: "accepted" });
  batch.set(friendshipRef,  { user1, user2, createdAt: serverTimestamp() });
  batch.update(doc(db, "users", receiverId), { friendsCount: increment(1) });
  await batch.commit();

  // Write 2: increment the SENDER's friendsCount separately.
  // The Firestore rule for users/{uid} update is relaxed (see firestore.rules)
  // to allow any authenticated user to increment friendsCount — it's a
  // non-sensitive counter and the friendship doc now exists as proof.
  await updateDoc(doc(db, "users", senderId), { friendsCount: increment(1) });

  // ── Phase 3: Notify original sender ────────────────────────────────────────
  try {
    const acceptorSnap = await getDoc(doc(db, "users", receiverId));
    const acceptorName = acceptorSnap.exists()
      ? (acceptorSnap.data() as UserProfile).displayName
      : "কেউ একজন";
    await createNotification({
      userId:        senderId,
      type:          "friend_request_accepted",
      actorId:       receiverId,
      actorName:     acceptorName,
      referenceId:   requestId,
      referenceType: "friendRequestAccepted",
    });
  } catch (err) {
    console.error("acceptFriendRequest notification failed:", err);
  }
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
    orderBy("createdAt", "desc"),
    limit(50)
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
    where("status", "==", "pending"),
    limit(50)
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
// Phase 4: uses searchTokens array-contains instead of username prefix range.
// Supports Bengali displayName and partial English username matching.
// Firestore only supports one array-contains per query, so we pass a single
// normalised token and return up to 20 matches (excluding self).
export async function searchUsers(
  searchTerm: string,
  currentUid: string
): Promise<UserProfile[]> {
  const raw = searchTerm.toLowerCase().trim();
  if (!raw) return [];

  // Take only the first word of the query to build the lookup token.
  // Multi-word queries ("মিফতাহুল ইসলাম") are handled by searching on the
  // first word then client-side filtering the second.
  const words  = raw.split(/[\s\u200B_.\-]+/).filter(Boolean);
  const token  = words[0];          // Firestore lookup key
  const rest   = words.slice(1);    // client-side secondary filter terms

  const q = query(
    collection(db, "users"),
    where("searchTokens", "array-contains", token),
    limit(30)
  );
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => d.data() as UserProfile)
    .filter((u) => {
      if (u.uid === currentUid) return false;
      // PHASE 6: banned accounts shouldn't be discoverable via search.
      if (u.isBlocked) return false;
      if (rest.length === 0) return true;
      // Secondary filter: every remaining word must appear somewhere in the
      // user's tokens (word-level) or their displayName / username directly.
      const haystack = (u.displayName + " " + u.username).toLowerCase();
      return rest.every((w) => haystack.includes(w));
    })
    .slice(0, 20);
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
