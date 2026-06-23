import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  writeBatch,
  onSnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db }              from "@/lib/firebase/config";
import { buildSearchTokens } from "@/lib/utils";
import type { Circle, CircleMember, CircleJoinRequest, CircleCategory } from "@/types/circle";

const PAGE_SIZE = 20;

// ─── Create Circle ─────────────────────────────────────────────────────────────
export async function createCircle(
  ownerId:    string,
  ownerName:  string,
  data: {
    name:        string;
    description: string;
    category:    CircleCategory;
    isPrivate:   boolean;
    tags:        string[];
  }
): Promise<string> {
  const ref = doc(collection(db, "circles"));

  const searchTokens = buildSearchTokens(data.name);

  await setDoc(ref, {
    ...data,
    ownerId,
    ownerName,
    coverPhoto:   "",
    avatarPhoto:  "",
    membersCount: 1,
    postsCount:   0,
    activeNow:    1,
    searchTokens,
    createdAt: serverTimestamp(),
  });

  // Auto-join owner as "owner" role
  await setDoc(doc(db, "circleMembers", `${ref.id}_${ownerId}`), {
    circleId:  ref.id,
    userId:    ownerId,
    userName:  ownerName,
    userPhoto: "",
    role:      "owner",
    joinedAt:  serverTimestamp(),
  });

  return ref.id;
}

// ─── Get Circle ────────────────────────────────────────────────────────────────
export async function getCircle(circleId: string): Promise<(Circle & { id: string }) | null> {
  const snap = await getDoc(doc(db, "circles", circleId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Circle & { id: string };
}

export function subscribeToCircle(
  circleId: string,
  callback: (circle: (Circle & { id: string }) | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "circles", circleId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Circle & { id: string }) : null);
  });
}

// ─── List Circles ──────────────────────────────────────────────────────────────
export async function getDiscoverCircles(
  category?: CircleCategory,
  lastDoc?:  QueryDocumentSnapshot
): Promise<{ circles: (Circle & { id: string })[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints: any[] = [];
  if (category) constraints.push(where("category", "==", category));
  constraints.push(orderBy("membersCount", "desc"), limit(PAGE_SIZE));
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collection(db, "circles"), ...constraints));
  return {
    circles: snap.docs.map((d) => ({ id: d.id, ...d.data() } as Circle & { id: string })),
    lastDoc:  snap.docs.at(-1) ?? null,
  };
}

export async function getMyCircles(
  userId: string
): Promise<(Circle & { id: string })[]> {
  const snap = await getDocs(
    query(collection(db, "circleMembers"), where("userId", "==", userId))
  );
  const circleIds = snap.docs.map((d) => d.data().circleId as string);
  if (circleIds.length === 0) return [];

  const circles = await Promise.all(circleIds.map((id) => getCircle(id)));
  return circles.filter(Boolean) as (Circle & { id: string })[];
}

export async function searchCircles(
  term: string
): Promise<(Circle & { id: string })[]> {
  const token = term.toLowerCase().trim();
  const snap  = await getDocs(
    query(
      collection(db, "circles"),
      where("searchTokens", "array-contains", token),
      limit(10)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Circle & { id: string }));
}

// ─── Membership ────────────────────────────────────────────────────────────────
export async function isMember(circleId: string, userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "circleMembers", `${circleId}_${userId}`));
  return snap.exists();
}

export async function getMemberRole(
  circleId: string, userId: string
): Promise<"owner" | "moderator" | "member" | null> {
  const snap = await getDoc(doc(db, "circleMembers", `${circleId}_${userId}`));
  if (!snap.exists()) return null;
  return snap.data().role as "owner" | "moderator" | "member";
}

export async function joinCircle(
  circleId:  string,
  userId:    string,
  userName:  string,
  userPhoto: string,
  isPrivate: boolean
): Promise<"joined" | "requested"> {
  if (isPrivate) {
    // Create join request instead
    const reqRef = doc(collection(db, "circleJoinRequests"));
    await setDoc(reqRef, {
      circleId,
      userId,
      userName,
      userPhoto,
      status:    "pending",
      createdAt: serverTimestamp(),
    });
    return "requested";
  }

  const batch = writeBatch(db);
  batch.set(doc(db, "circleMembers", `${circleId}_${userId}`), {
    circleId,
    userId,
    userName,
    userPhoto,
    role:     "member",
    joinedAt: serverTimestamp(),
  });
  batch.update(doc(db, "circles", circleId), { membersCount: increment(1) });
  await batch.commit();
  return "joined";
}

export async function leaveCircle(circleId: string, userId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "circleMembers", `${circleId}_${userId}`));
  batch.update(doc(db, "circles", circleId), { membersCount: increment(-1) });
  await batch.commit();
}

export async function getCircleMembers(
  circleId: string
): Promise<(CircleMember & { id: string })[]> {
  const snap = await getDocs(
    query(
      collection(db, "circleMembers"),
      where("circleId", "==", circleId),
      orderBy("joinedAt", "asc"),
      limit(50)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CircleMember & { id: string }));
}

export async function promoteMember(
  circleId: string,
  userId:   string,
  role:     "moderator" | "member"
): Promise<void> {
  await updateDoc(doc(db, "circleMembers", `${circleId}_${userId}`), { role });
}

// ─── Join Requests (private circles) ──────────────────────────────────────────
export async function getPendingRequests(
  circleId: string
): Promise<(CircleJoinRequest & { id: string })[]> {
  const snap = await getDocs(
    query(
      collection(db, "circleJoinRequests"),
      where("circleId", "==", circleId),
      where("status",   "==", "pending")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CircleJoinRequest & { id: string }));
}

export async function approveRequest(
  requestId:  string,
  circleId:   string,
  userId:     string,
  userName:   string,
  userPhoto:  string
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "circleJoinRequests", requestId), { status: "approved" });
  batch.set(doc(db, "circleMembers", `${circleId}_${userId}`), {
    circleId,
    userId,
    userName,
    userPhoto,
    role:     "member",
    joinedAt: serverTimestamp(),
  });
  batch.update(doc(db, "circles", circleId), { membersCount: increment(1) });
  await batch.commit();
}

export async function rejectRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, "circleJoinRequests", requestId), { status: "rejected" });
}

// ─── Circle Posts ──────────────────────────────────────────────────────────────
// Circle posts are regular "posts" with an extra circleId field.
// We filter the feed by circleId.
export async function getCircleFeed(
  circleId: string,
  lastDoc?:  QueryDocumentSnapshot
): Promise<{ posts: any[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints: any[] = [
    where("circleId", "==", circleId),
    orderBy("createdAt", "desc"),
    limit(15),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collection(db, "posts"), ...constraints));
  return {
    posts:   snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs.at(-1) ?? null,
  };
}

// ─── Update Circle (owner only) ────────────────────────────────────────────────
export async function updateCircle(
  circleId: string,
  data: Partial<Pick<Circle, "name" | "description" | "category" | "isPrivate" | "tags" | "coverPhoto" | "avatarPhoto">>
): Promise<void> {
  const update: Record<string, unknown> = { ...data };
  if (data.name) update.searchTokens = buildSearchTokens(data.name);
  await updateDoc(doc(db, "circles", circleId), update);
}

export async function deleteCircle(circleId: string): Promise<void> {
  // Remove members first
  const members = await getDocs(
    query(collection(db, "circleMembers"), where("circleId", "==", circleId))
  );
  const batch = writeBatch(db);
  members.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "circles", circleId));
  await batch.commit();
}
