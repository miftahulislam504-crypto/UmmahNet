import {
  collection,
  doc,
  addDoc,
  setDoc,
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
import { uploadCompressedImage, COMPRESS_PRESETS } from "@/lib/firebase/storage";

const PAGE_SIZE = 10;

// ─── Create Post ──────────────────────────────────────────────────────────────
// PHASE 7 FIX: images used to be converted to Base64 and stored inline in
// the post document. A handful of photos could push a single post past
// Firestore's 1MB document limit and made every feed page heavy to read.
// Now each image is compressed client-side and uploaded to Firebase Storage
// at posts/images/{postId}_{i}.jpg (rules already in storage.rules); only
// the small https download URL is written to Firestore.
export async function createPost(
  authorId:    string,
  authorName:  string,
  authorPhoto: string | null | undefined,
  content:     string,
  mediaFiles:  File[],
  visibility:  Post["visibility"] = "public"
): Promise<string> {
  // Pre-generate the doc ID so uploaded image paths can reference it.
  const postRef = doc(collection(db, "posts"));

  const mediaUrls = await Promise.all(
    mediaFiles.map((file, i) =>
      uploadCompressedImage(`posts/images/${postRef.id}_${i}.jpg`, file, COMPRESS_PRESETS.post)
    )
  );

  const type: Post["type"] = mediaFiles.length > 0 ? "image" : "text";

  await setDoc(postRef, {
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
  return postRef.id;
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

// ─── Friend Feed ──────────────────────────────────────────────────────────────
// BUG 3 FIX: the feed showed ALL public posts from everyone on the platform.
// A social network feed should only show posts from people you follow/friend.
//
// Firestore doesn't support JOIN queries, so we:
//   1. Load the caller's friend UIDs from friendships collection (both user1
//      and user2 directions), add self UID so own posts also appear.
//   2. Use `where("authorId", "in", [...])` — Firestore supports up to 30
//      values per `in` clause. For > 29 friends we chunk into multiple queries
//      and merge client-side (same pattern as subscribeToStories).
//   3. Filter visibility: friends see "public" + "friends" posts from each other.
//      Strangers' posts never appear (they're excluded by authorId filter).
export async function getFriendFeed(
  myUid:   string,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ posts: (Post & { id: string })[]; lastDoc: QueryDocumentSnapshot | null }> {
  // Step 1: collect friend UIDs
  const [snap1, snap2] = await Promise.all([
    getDocs(query(collection(db, "friendships"), where("user1", "==", myUid))),
    getDocs(query(collection(db, "friendships"), where("user2", "==", myUid))),
  ]);
  const friendIds = [
    ...snap1.docs.map((d) => d.data().user2 as string),
    ...snap2.docs.map((d) => d.data().user1 as string),
  ];
  const authorIds = Array.from(new Set([myUid, ...friendIds]));

  // Step 2: chunk into groups of 30 (Firestore "in" limit)
  const chunks: string[][] = [];
  for (let i = 0; i < authorIds.length; i += 30) {
    chunks.push(authorIds.slice(i, i + 30));
  }

  // Step 3: query each chunk
  const allResults = await Promise.all(
    chunks.map((chunk) => {
      const c: any[] = [
        where("authorId",   "in", chunk),
        where("visibility", "in", ["public", "friends"]),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE),
      ];
      if (lastDoc) c.push(startAfter(lastDoc));
      return getDocs(query(collection(db, "posts"), ...c));
    })
  );

  // Merge, sort desc, apply banned filter, take PAGE_SIZE
  const merged = allResults
    .flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() } as Post & { id: string })))
    .filter((p) => !p.authorBanned)
    .sort((a, b) => {
      const ta = (a.createdAt as any)?.toMillis?.() ?? 0;
      const tb = (b.createdAt as any)?.toMillis?.() ?? 0;
      return tb - ta;
    })
    .slice(0, PAGE_SIZE);

  return {
    posts:   merged,
    lastDoc: merged.length > 0 ? (allResults[0]?.docs.at(-1) ?? null) : null,
  };
}
// PHASE 6 FIX: posts from accounts an admin has banned are filtered out
// client-side via the denormalized `authorBanned` flag (set/cleared by
// adminService.setBanStatus). Most posts don't have this field at all, and
// a Firestore `!=` query would exclude *those* too — so this stays a
// client-side filter rather than a query constraint. As a result a page can
// occasionally come back with fewer than PAGE_SIZE posts; acceptable for a
// moderation edge case.
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
    posts: snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Post & { id: string }))
      .filter((p) => !p.authorBanned),
    lastDoc: snap.docs.at(-1) ?? null,
  };
}

// ─── User Posts ───────────────────────────────────────────────────────────────
// PHASE 6 FIX: previously this returned EVERY post by `uid` regardless of
// `visibility` — opening anyone's profile showed their "friends" and
// "private" posts too (the privacy leak originally flagged for Phase 2).
// `viewerRelation` now narrows the query:
//   "owner"    — viewing your own profile        → all posts
//   "friend"   — viewer is friends with author   → public + friends
//   "stranger" — anyone else (default)           → public only
// Requires the composite index {authorId ASC, visibility ASC, createdAt DESC}
// added to firestore.indexes.json for the "friend"/"stranger" cases.
export async function getUserPosts(
  uid:            string,
  lastDoc?:       QueryDocumentSnapshot,
  viewerRelation: "owner" | "friend" | "stranger" = "stranger"
): Promise<{ posts: (Post & { id: string })[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints: any[] = [where("authorId", "==", uid)];

  if (viewerRelation === "friend") {
    constraints.push(where("visibility", "in", ["public", "friends"]));
  } else if (viewerRelation === "stranger") {
    constraints.push(where("visibility", "==", "public"));
  }
  // "owner": no visibility constraint — sees everything, including private.

  constraints.push(orderBy("createdAt", "desc"), limit(PAGE_SIZE));
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
    callback(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Post & { id: string }))
        .filter((p) => !p.authorBanned) // PHASE 6: hide banned authors' posts
    )
  );
}
