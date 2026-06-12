import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Notification } from "@/types";

// ─── Create notification ──────────────────────────────────────────────────────
export async function createNotification(data: {
  userId:        string;
  type:          Notification["type"];
  actorId:       string;
  actorName:     string;
  referenceId:   string;
  referenceType: string;
}): Promise<void> {
  // Don't notify yourself
  if (data.userId === data.actorId) return;

  await addDoc(collection(db, "notifications"), {
    ...data,
    read:      false,
    createdAt: serverTimestamp(),
  });
}

// ─── Mark single notification as read ────────────────────────────────────────
export async function markNotificationRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notifId), { read: true });
}

// ─── Mark all as read ─────────────────────────────────────────────────────────
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const q    = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read",   "==", false)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

// ─── Subscribe to notifications (realtime) ───────────────────────────────────
export function subscribeToNotifications(
  userId:   string,
  callback: (notifs: (Notification & { id: string })[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(30)
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification & { id: string })))
  );
}
