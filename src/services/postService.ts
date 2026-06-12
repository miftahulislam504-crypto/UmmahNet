import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
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
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase/config";
import type { Post, Comment } from "@/types";

const PAGE_SIZE = 10;

// ─── Create Post ──────────────────────────────────────────────────────────────
export async function createPost(
  authorId:    string,
  authorName:  string,
  authorPhoto: string,
  content:     string,
  mediaFiles:  File[],
  visibility:  Post["visibility"] = "public"
): Promise<string> {
  // Upload media first
  const mediaUrls: string[] = [];
  for (const file of mediaFiles) {
    const ext      = file.name.split(".").pop();
    const path     = `posts/images/${authorId}_${Date.now()}.${ext}`;
    const storRef  = ref(storage, path);
    await uploadBytes(storRef, file);
    const url = await getDownloadURL(storRef);
    mediaUrls.push(url);
  }

  const type: Post["type"] = mediaFiles.length > 0 ? "image" : "text";

  const ref2 = await addDoc(collection(db, "posts"), {
    authorId,
    authorName,
    authorPhoto,
    content:       content.trim(),
    mediaUrls,
    type,
    likesCount:    0,
    commentsCount: 0,
    sharesCount:   0,
    visibility,
    createdAt: serverTimestamp(),
  });

  // Increment user postsCount
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
export async function toggleLike(
  postId: string,
  userId: string
): Promise<boolean> {
  const likeId  = `${postId}_${userId}`;
  const likeRef = doc(db, "likes", likeId);
  const snap    = await getDoc(likeRef);

  const batch = writeBatch(db);
  if (snap.exists()) {
    batch.delete(likeRef);
    batch.update(doc(db, "posts", postId), { likesCount: increment(-1) });
    await batch.commit();
    return false; // unliked
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
    return true; // liked
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

// ─── Public Feed (paginated) ──────────────────────────────────────────────────
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

// ─── User Posts (for profile) ─────────────────────────────────────────────────
export async function getUserPosts(
  uid:     string,
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

// ─── Realtime new posts listener ──────────────────────────────────────────────
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
