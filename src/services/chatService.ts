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
  increment,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Conversation, Message, UserPresence } from "@/types";
import { createNotification } from "@/services/notificationService";
import { uploadCompressedImage, COMPRESS_PRESETS, randomId } from "@/lib/firebase/storage";

// ─── Get or create private conversation ──────────────────────────────────────
export async function getOrCreateConversation(
  myUid:    string,
  theirUid: string
): Promise<string> {
  const participants = [myUid, theirUid].sort();

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
    type:          "private",
    lastMessage:   "",
    lastSenderId:  "",
    updatedAt:     serverTimestamp(),
    unreadCounts:  { [myUid]: 0, [theirUid]: 0 },  // Phase 5
  });
  return ref2.id;
}

// ─── Send message ─────────────────────────────────────────────────────────────
// PHASE 7 FIX: chat images used to be read via FileReader.readAsDataURL()
// and stored as full Base64 strings directly inside each Firestore message
// document. Because the 1MB document limit applies per document and a single
// photo can easily be 200–800 KB as Base64, sending a photo would silently
// fail (or create an oversized document that Firestore rejects). Now the
// image is compressed client-side and uploaded to Firebase Storage at
// chat/images/{conversationId}/{msgId}.jpg; only the small download URL is
// written to the message document.
export async function sendMessage(
  conversationId: string,
  senderId:       string,
  text:           string,
  imageFile?:     File
): Promise<void> {
  const msgId = randomId();
  let mediaUrl = "";

  if (imageFile) {
    mediaUrl = await uploadCompressedImage(
      `chat/images/${conversationId}/${msgId}.jpg`,
      imageFile,
      COMPRESS_PRESETS.chat
    );
  }

  // Fetch conversation to get the other participant's UID
  const convSnap = await getDoc(doc(db, "conversations", conversationId));
  const participants: string[] = convSnap.exists()
    ? (convSnap.data().participants ?? [])
    : [];
  const recipientId = participants.find((uid) => uid !== senderId);

  const batch  = writeBatch(db);
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

  // Phase 5: increment recipient's unread counter
  const convUpdate: Record<string, any> = {
    lastMessage:  imageFile ? "📷 ছবি" : text.trim(),
    lastSenderId: senderId,
    updatedAt:    serverTimestamp(),
  };
  if (recipientId) {
    convUpdate[`unreadCounts.${recipientId}`] = increment(1);
  }
  batch.update(doc(db, "conversations", conversationId), convUpdate);

  await batch.commit();

  // Phase 3 notification (fire-and-forget)
  if (recipientId) {
    try {
      const senderSnap = await getDoc(doc(db, "users", senderId));
      const senderName = senderSnap.exists()
        ? (senderSnap.data() as { displayName: string }).displayName
        : "কেউ একজন";
      await createNotification({
        userId:        recipientId,
        type:          "message",
        actorId:       senderId,
        actorName:     senderName,
        referenceId:   conversationId,
        referenceType: "conversation",
      });
    } catch (err) {
      console.error("sendMessage notification failed:", err);
    }
  }
}

// ─── Mark messages as seen + reset unread counter ────────────────────────────
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
  const toMark = snap.docs.filter((d) => d.data().senderId !== myUid);
  if (toMark.length === 0) return;

  const batch = writeBatch(db);
  toMark.forEach((d) =>
    batch.update(d.ref, { seen: true, seenAt: serverTimestamp() })
  );
  // Phase 5: reset my unread counter
  batch.update(doc(db, "conversations", conversationId), {
    [`unreadCounts.${myUid}`]: 0,
  });
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

// ─── Phase 5: Presence ───────────────────────────────────────────────────────
// Write online status to Firestore users/{uid} directly.
// Uses visibilitychange + beforeunload for reliable offline detection.
export function initPresence(uid: string): () => void {
  if (typeof window === "undefined") return () => {};

  const ref = doc(db, "users", uid);

  async function setOnline() {
    try {
      await updateDoc(ref, { online: true, lastSeen: serverTimestamp() });
    } catch {}
  }

  async function setOffline() {
    try {
      await updateDoc(ref, {
        online:   false,
        lastSeen: serverTimestamp(),
      });
    } catch {}
  }

  function handleVisibility() {
    if (document.visibilityState === "visible") setOnline();
    else setOffline();
  }

  setOnline();
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("beforeunload", setOffline);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("beforeunload", setOffline);
    setOffline();
  };
}

// ─── Phase 5: Subscribe to a user's presence ─────────────────────────────────
export function subscribeToPresence(
  uid:      string,
  callback: (presence: UserPresence) => void
): Unsubscribe {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    callback({
      online:   data.online ?? false,
      lastSeen: data.lastSeen ?? null,
    });
  });
}
