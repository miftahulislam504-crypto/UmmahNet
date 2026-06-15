import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  updateDoc,
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
import { db } from "@/lib/firebase/config";
import type { Post, Comment } from "@/types";
import { createNotification } from "@/services/notificationService";

const PAGE_SIZE = 10;

// ─── File → Base64 (max 1080px, quality 0.85) ────────────────────────────────
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1080;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Create Post ──────────────────────────────────────────────────────────────
export async function createPost(
  authorId:    string,
  authorName:  string,
  authorPhoto: string | null | undefined,
  content:     string,
  mediaFiles:  File[],
  visibility:  Post["visibility"] = "public"
): Promise<string> {
  // Convert all images to Base64
  const mediaUrls: string[] = [];
  for (const file of mediaFiles) {
    const base64 = await fileToBase64(file);
    mediaUrls.push(base64);
  }

  const type: Post["type"] = mediaFiles.length > 0 ? "image" : "text";

  const ref2 = await addDoc(collection(db, "posts"), {
    authorId,
    authorName,
    authorPhoto:   authorPhoto ?? "",
    content:       content.trim(),
    mediaUrls,
    type,
    likesCount:    0,
    commentsCount: 0,
    sharesCount:   0,
    visibility,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "users", authorId), { postsCount: increment(1) });
  return ref2.id;
}

// ─── Delete Post ──────────────────────────────────────────────────────────────
export async function deletePost(postId: string, authorId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "posts", postId));
  batch.update(doc(db, "users", authorId), { postsCount: increment(-1) });
  await batch.commit();
}

// ─── Like / Unlike ────────────────────────────────────────────────────────────
export async function toggleLike(postId: string, userId: string): Promise<boolean> {
  const likeId  = `${postId}_${userId}`;
  const likeRef = doc(db, "likes", likeId);
  const snap    = await getDoc(likeRef);

  const batch = writeBatch(db);
  if (snap.exists()) {
    // Unlike — no notification needed
    batch.delete(likeRef);
    batch.update(doc(db, "posts", postId), { likesCount: increment(-1) });
    await batch.commit();
    return false;
  } else {
    batch.set(likeRef, {
      postId,
      userId,
      targetId:   postId,
      targetType: "post",
      createdAt:  serverTimestamp(),
    });
    batch.update(doc(db, "posts", postId), { likesCount: increment(1) });
    await batch.commit();

    // ── Phase 3: Notify post author ──────────────────────────────────────────
    try {
      const [postSnap, likerSnap] = await Promise.all([
        getDoc(doc(db, "posts", postId)),
        getDoc(doc(db, "users", userId)),
      ]);
      if (postSnap.exists()) {
        const authorId  = (postSnap.data() as Post).authorId;
        const likerName = likerSnap.exists()
          ? (likerSnap.data() as { displayName: string }).displayName
          : "কেউ একজন";
        await createNotification({
          userId:        authorId,
          type:          "post_like",
          actorId:       userId,
          actorName:     likerName,
          referenceId:   postId,
          referenceType: "post",
        });
      }
    } catch (err) {
      console.error("toggleLike notification failed:", err);
    }

    return true;
  }
}

export async function isLikedByUser(postId: string, userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "likes", `${postId}_${userId}`));
  return snap.exists();
}

// ─── Comments ─────────────────────────────────────────────────────────────────
export async function addComment(
  postId:          string,
  authorId:        string,
  authorName:      string,
  authorPhoto:     string,
  content:         string,
  parentCommentId: string | null = null
): Promise<string> {
  const ref2 = await addDoc(collection(db, "comments"), {
    postId,
    authorId,
    authorName,
    authorPhoto,
    content:         content.trim(),
    likesCount:      0,
    parentCommentId,
    createdAt:       serverTimestamp(),
  });
  await updateDoc(doc(db, "posts", postId), { commentsCount: increment(1) });

  // ── Phase 3: Notify post author ──────────────────────────────────────────
  try {
    const postSnap = await getDoc(doc(db, "posts", postId));
    if (postSnap.exists()) {
      const postAuthorId = (postSnap.data() as Post).authorId;
      await createNotification({
        userId:        postAuthorId,
        type:          "post_comment",
        actorId:       authorId,
        actorName:     authorName,
        referenceId:   postId,
        referenceType: "post",
      });
    }
  } catch (err) {
    console.error("addComment notification failed:", err);
  }

  return ref2.id;
}

export async function deleteComment(commentId: string, postId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "comments", commentId));
  batch.update(doc(db, "posts", postId), { commentsCount: increment(-1) });
  await batch.commit();
}

export function subscribeToComments(
  postId:   string,
  callback: (comments: (Comment & { id: string })[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "comments"),
    where("postId",          "==", postId),
    where("parentCommentId", "==", null),
    orderBy("createdAt", "asc"),
    limit(50)
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comment & { id: string })))
  );
}

// ─── Public Feed ──────────────────────────────────────────────────────────────
export async function getPublicFeed(
  lastDoc?: QueryDocumentSnapshot
): Promise<{ posts: (Post & { id: string })[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints: any[] = [
    where("visibility", "==", "public"),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collection(db, "posts"), ...constraints));
  return {
    posts:   snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post & { id: string })),
    lastDoc: snap.docs.at(-1) ?? null,
  };
}

// ─── User Posts ───────────────────────────────────────────────────────────────
export async function getUserPosts(
  uid:      string,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ posts: (Post & { id: string })[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints: any[] = [
    where("authorId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collection(db, "posts"), ...constraints));
  return {
    posts:   snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post & { id: string })),
    lastDoc: snap.docs.at(-1) ?? null,
  };
}

// ─── Realtime feed listener ───────────────────────────────────────────────────
export function subscribeToFeed(
  callback: (posts: (Post & { id: string })[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "posts"),
    where("visibility", "==", "public"),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE)
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post & { id: string })))
  );
}
