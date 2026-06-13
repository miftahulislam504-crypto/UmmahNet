import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/config";
import type { Conversation, Message } from "@/types";

// ─── Get or create private conversation ──────────────────────────────────────
export async function getOrCreateConversation(
  myUid:    string,
  theirUid: string
): Promise<string> {
  const participants = [myUid, theirUid].sort();

  const q    = query(
    collection(db, "conversations"),
    where("participants", "==", participants),
    where("type",         "==", "private")
  );
  const snap = await getDocs(q);

  if (!snap.empty) return snap.docs[0].id;

  const ref2 = await addDoc(collection(db, "conversations"), {
    participants,
    type:         "private",
    lastMessage:  "",
    lastSenderId: "",
    updatedAt:    serverTimestamp(),
  });
  return ref2.id;
}

// ─── Send message ─────────────────────────────────────────────────────────────
export async function sendMessage(
  conversationId: string,
  senderId:       string,
  text:           string,
  imageFile?:     File
): Promise<void> {
  let mediaUrl = "";
  if (imageFile) {
    const path    = `chat/images/${conversationId}/${Date.now()}_${imageFile.name}`;
    const storRef = ref(storage, path);
    await uploadBytes(storRef, imageFile);
    mediaUrl = await getDownloadURL(storRef);
  }

  const batch = writeBatch(db);

  const msgRef = doc(collection(db, "messages"));
  batch.set(msgRef, {
    conversationId,
    senderId,
    text:      text.trim(),
    mediaUrl,
    type:      imageFile ? "image" : "text",
    seen:      false,
    seenAt:    null,
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, "conversations", conversationId), {
    lastMessage:  imageFile ? "📷 Photo" : text.trim(),
    lastSenderId: senderId,
    updatedAt:    serverTimestamp(),
  });

  await batch.commit();
}

// ─── Mark messages as seen ────────────────────────────────────────────────────
// BUG 2 FIX: previously used "senderId", "!=", myUid.
// The != operator combined with a compound query requires a separate
// Firestore index, which was missing from indexes.json — causing a silent crash in production.
// Fix: dropped "!=" and filter on the client side instead.
export async function markAsSeen(
  conversationId: string,
  myUid:          string
): Promise<void> {
  const q    = query(
    collection(db, "messages"),
    where("conversationId", "==", conversationId),
    where("seen",           "==", false),
    limit(50)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  // Client-side filter: only mark the other person's unseen messages
  const toMark = snap.docs.filter((d) => d.data().senderId !== myUid);
  if (toMark.length === 0) return;

  const batch = writeBatch(db);
  toMark.forEach((d) =>
    batch.update(d.ref, { seen: true, seenAt: serverTimestamp() })
  );
  await batch.commit();
}

// ─── Subscribe to messages (realtime) ────────────────────────────────────────
export function subscribeToMessages(
  conversationId: string,
  callback:       (msgs: (Message & { id: string })[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "messages"),
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message & { id: string })))
  );
}

// ─── Subscribe to conversation list ──────────────────────────────────────────
export function subscribeToConversations(
  myUid:    string,
  callback: (convs: (Conversation & { id: string })[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", myUid),
    orderBy("updatedAt", "desc"),
    limit(30)
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation & { id: string })))
  );
}

// ─── Get other participant's profile ─────────────────────────────────────────
export async function getOtherParticipant(
  participants: string[],
  myUid:        string
) {
  const otherId = participants.find((id) => id !== myUid);
  if (!otherId) return null;
  const snap = await getDoc(doc(db, "users", otherId));
  return snap.exists() ? { uid: otherId, ...snap.data() } : null;
}
