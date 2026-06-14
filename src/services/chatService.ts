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
import { db } from "@/lib/firebase/config";
import type { Conversation, Message } from "@/types";

// ─── Get or create private conversation ──────────────────────────────────────
export async function getOrCreateConversation(
  myUid:    string,
  theirUid: string
): Promise<string> {
  const participants = [myUid, theirUid].sort();

  // BUG FIX: "==" on array doesn't work in Firestore.
  // Use array-contains + client-side filter instead.
  const q    = query(
    collection(db, "conversations"),
    where("participants", "array-contains", myUid),
    where("type", "==", "private"),
    limit(50)
  );
  const snap = await getDocs(q);

  const existing = snap.docs.find((d) => {
    const p: string[] = d.data().participants ?? [];
    return p.includes(theirUid) && p.length === 2;
  });
  if (existing) return existing.id;

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
    // Convert image to Base64 instead of Firebase Storage
    mediaUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });
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
// BUG FIX: removed orderBy("updatedAt") + where("type") compound query
// which required a composite Firestore index that caused silent loading failure.
// Now: simple array-contains query, sort client-side.
export function subscribeToConversations(
  myUid:    string,
  callback: (convs: (Conversation & { id: string })[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", myUid),
    limit(30)
  );
  return onSnapshot(q, (snap) => {
    const convs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Conversation & { id: string }))
      .sort((a, b) => {
        const ta = (a as any).updatedAt?.toMillis?.() ?? 0;
        const tb = (b as any).updatedAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
    callback(convs);
  });
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
