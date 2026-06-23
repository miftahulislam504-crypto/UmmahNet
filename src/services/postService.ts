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
import { db }                        from "@/lib/firebase/config";
import type { Post, Comment, PostType } from "@/types";
import { createNotification }        from "@/services/notificationService";
import { uploadCompressedImage, COMPRESS_PRESETS } from "@/lib/firebase/storage";

const PAGE_SIZE = 10;

// ─── Create Post (Phase 12: extended with new types) ─────────────────────────
export async function createPost(
  authorId:    string,
  authorName:  string,
  authorPhoto: string | null | undefined,
  content:     string,
  mediaFiles:  File[],
  visibility:  Post["visibility"] = "public",
  // Phase 12 extras
  options?: {
    type?:          PostType;
    pollOptions?:   string[];      // for "poll"
    articleTitle?:  string;        // for "article"
    threadId?:      string;        // for "thread" continuation
    threadIndex?:   number;
    quotedPostId?:  string;        // for "quote"
    quotedContent?: string;
    quotedAuthorName?: string;
  }
): Promise<string> {
  const postRef = doc(collection(db, "posts"));

  const mediaUrls = await Promise.all(
    mediaFiles.map((file, i) =>
      uploadCompressedImage(`posts/images/${postRef.id}_${i}.jpg`, file, COMPRESS_PRESETS.post)
    )
  );

  // Auto-detect type if not supplied
  let type: PostType = options?.type
    ?? (mediaFiles.length > 0 ? "image" : "text");

  const baseData: Record<string, unknown> = {
    authorId,
    authorName,
    authorPhoto:   authorPhoto ?? "",
    content:       content.trim(),
    mediaUrls,
    type,
    // Phase 12: benefitsCount replaces likesCount
    benefitsCount: 0,
    likesCount:    0,   // kept for backward compat
    commentsCount: 0,
    sharesCount:   0,
    visibility,
    createdAt: serverTimestamp(),
  };

  // Type-specific fields
  if (type === "poll" && options?.pollOptions?.length) {
    baseData.pollOptions = options.pollOptions.map((text, i) => ({
      id: `opt_${i}`, text, votes: 0,
    }));
  }
  if (type === "article" && options?.articleTitle) {
    baseData.articleTitle = options.articleTitle;
  }
  if (type === "thread") {
    baseData.threadId    = options?.threadId    ?? postRef.id;
    baseData.threadIndex = options?.threadIndex ?? 1;
  }
  if (type === "quote" && options?.quotedPostId) {
    baseData.quotedPostId      = options.quotedPostId;
    baseData.quotedContent     = options.quotedContent     ?? "";
    baseData.quotedAuthorName  = options.quotedAuthorName  ?? "";
  }

  await setDoc(postRef, baseData);
  await updateDoc(doc(db, "users", authorId), { postsCount: increment(1) });
  return postRef.id;
}

// ─── Create Thread (Phase 12) ─────────────────────────────────────────────────
// Creates multiple connected posts sharing a threadId.
export async function createThread(
  authorId:    string,
  authorName:  string,
  authorPhoto: string,
  parts:       string[],   // array of text content per thread post
  visibility:  Post["visibility"] = "public"
): Promise<string> {
  if (parts.length === 0) return "";

  // First post determines the threadId
  const firstId = (doc(collection(db, "posts"))).id;
  const batch   = writeBatch(db);

  parts.forEach((content, i) => {
    const ref = i === 0
      ? doc(db, "posts", firstId)
      : doc(collection(db, "posts"));

    batch.set(ref, {
      authorId,
      authorName,
      authorPhoto,
      content:       content.trim(),
      mediaUrls:     [],
      type:          "thread",
      threadId:      firstId,
      threadIndex:   i + 1,
      benefitsCount: 0,
      likesCount:    0,
      commentsCount: 0,
      sharesCount:   0,
      visibility,
      createdAt:     serverTimestamp(),
    });
  });

  batch.update(doc(db, "users", authorId), {
    postsCount: increment(parts.length),
  });

  await batch.commit();
  return firstId;
}

// ─── Delete Post ──────────────────────────────────────────────────────────────
export async function deletePost(postId: string, authorId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "posts", postId));
  batch.update(doc(db, "users", authorId), { postsCount: increment(-1) });
  await batch.commit();
}

// ─── Benefit / Un-benefit (Phase 12: replaces Like) ──────────────────────────
export async function toggleBenefit(postId: string, userId: string): Promise<boolean> {
  // Store in "benefits" collection; also mirror to legacy "likes" for compat
  const benefitId  = `${postId}_${userId}`;
  const benefitRef = doc(db, "benefits", benefitId);
  const snap       = await getDoc(benefitRef);

  const batch = writeBatch(db);

  if (snap.exists()) {
    // Remove benefit
    batch.delete(benefitRef);
    batch.update(doc(db, "posts", postId), {
      benefitsCount: increment(-1),
      likesCount:    increment(-1),
    });
    await batch.commit();
    return false;
  }

  // Add benefit
  batch.set(benefitRef, {
    postId,
    userId,
    targetId:   postId,
    targetType: "post",
    createdAt:  serverTimestamp(),
  });
  batch.update(doc(db, "posts", postId), {
    benefitsCount: increment(1),
    likesCount:    increment(1),
  });
  await batch.commit();

  // Notify post author
  try {
    const [postSnap, giverSnap] = await Promise.all([
      getDoc(doc(db, "posts",  postId)),
      getDoc(doc(db, "users",  userId)),
    ]);
    if (postSnap.exists()) {
      const authorId  = (postSnap.data() as Post).authorId;
      const giverName = giverSnap.exists()
        ? (giverSnap.data() as { displayName: string }).displayName
        : "কেউ একজন";
      if (authorId !== userId) {
        await createNotification({
          userId:        authorId,
          type:          "post_benefit",
          actorId:       userId,
          actorName:     giverName,
          referenceId:   postId,
          referenceType: "post",
        });
      }
    }
  } catch (err) {
    console.error("toggleBenefit notification failed:", err);
  }

  return true;
}

// Legacy alias so old code still works
export const toggleLike = toggleBenefit;

export async function isBenefitedByUser(postId: string, userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "benefits", `${postId}_${userId}`));
  return snap.exists();
}
export const isLikedByUser = isBenefitedByUser;

// ─── Poll Vote (Phase 12) ─────────────────────────────────────────────────────
export async function votePoll(
  postId: string, userId: string, optionId: string
): Promise<void> {
  const voteRef = doc(db, "pollVotes", `${postId}_${userId}`);
  const snap    = await getDoc(voteRef);
  if (snap.exists()) return;  // already voted

  const batch = writeBatch(db);
  batch.set(voteRef, { postId, userId, optionId, createdAt: serverTimestamp() });

  // Increment the option's vote count inside the post document
  const postSnap = await getDoc(doc(db, "posts", postId));
  if (postSnap.exists()) {
    const post = postSnap.data() as Post;
    const opts = (post.pollOptions ?? []).map((o) =>
      o.id === optionId ? { ...o, votes: o.votes + 1 } : o
    );
    batch.update(doc(db, "posts", postId), { pollOptions: opts });
  }
  await batch.commit();
}

export async function getPollVote(
  postId: string, userId: string
): Promise<string | null> {
  const snap = await getDoc(doc(db, "pollVotes", `${postId}_${userId}`));
  return snap.exists() ? (snap.data().optionId as string) : null;
}

// ─── Comments / Reflections ───────────────────────────────────────────────────
export async function addComment(
  postId:          string,
  authorId:        string,
  authorName:      string,
  authorPhoto:     string,
  content:         string,
  parentCommentId: string | null = null
): Promise<string> {
  const ref = await addDoc(collection(db, "comments"), {
    postId,
    authorId,
    authorName,
    authorPhoto,
    content:         content.trim(),
    likesCount:      0,
    parentCommentId,
    isAcceptedAnswer: false,
    createdAt:       serverTimestamp(),
  });
  await updateDoc(doc(db, "posts", postId), { commentsCount: increment(1) });

  try {
    const postSnap = await getDoc(doc(db, "posts", postId));
    if (postSnap.exists()) {
      const postAuthorId = (postSnap.data() as Post).authorId;
      if (postAuthorId !== authorId) {
        await createNotification({
          userId:        postAuthorId,
          type:          "post_comment",
          actorId:       authorId,
          actorName:     authorName,
          referenceId:   postId,
          referenceType: "post",
        });
      }
    }
  } catch (err) {
    console.error("addComment notification failed:", err);
  }

  return ref.id;
}

export async function deleteComment(commentId: string, postId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "comments", commentId));
  batch.update(doc(db, "posts", postId), { commentsCount: increment(-1) });
  await batch.commit();
}

// Phase 12: Mark best answer for Question posts
export async function markAcceptedAnswer(
  commentId: string, postId: string
): Promise<void> {
  const batch = writeBatch(db);
  // Clear any existing accepted answer
  const existing = await getDocs(
    query(collection(db, "comments"), where("postId", "==", postId), where("isAcceptedAnswer", "==", true))
  );
  existing.docs.forEach((d) => batch.update(d.ref, { isAcceptedAnswer: false }));
  batch.update(doc(db, "comments", commentId), { isAcceptedAnswer: true });
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

// ─── Feeds ────────────────────────────────────────────────────────────────────
export async function getFriendFeed(
  myUid:   string,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ posts: (Post & { id: string })[]; lastDoc: QueryDocumentSnapshot | null }> {
  const [snap1, snap2] = await Promise.all([
    getDocs(query(collection(db, "friendships"), where("user1", "==", myUid))),
    getDocs(query(collection(db, "friendships"), where("user2", "==", myUid))),
  ]);
  const friendIds = [
    ...snap1.docs.map((d) => d.data().user2 as string),
    ...snap2.docs.map((d) => d.data().user1 as string),
  ];
  const authorIds = Array.from(new Set([myUid, ...friendIds]));

  const chunks: string[][] = [];
  for (let i = 0; i < authorIds.length; i += 30) chunks.push(authorIds.slice(i, i + 30));

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

  const merged = allResults
    .flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() } as Post & { id: string })))
    .filter((p) => !p.authorBanned)
    // Phase 12: map old likesCount → benefitsCount for legacy posts
    .map((p) => ({
      ...p,
      benefitsCount: p.benefitsCount ?? p.likesCount ?? 0,
    }))
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
      .filter((p) => !p.authorBanned)
      .map((p) => ({ ...p, benefitsCount: p.benefitsCount ?? p.likesCount ?? 0 })),
    lastDoc: snap.docs.at(-1) ?? null,
  };
}

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

  constraints.push(orderBy("createdAt", "desc"), limit(PAGE_SIZE));
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collection(db, "posts"), ...constraints));
  return {
    posts:   snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Post & { id: string }))
      .map((p) => ({ ...p, benefitsCount: p.benefitsCount ?? p.likesCount ?? 0 })),
    lastDoc: snap.docs.at(-1) ?? null,
  };
}

// Phase 12: Fetch all posts in a thread
export async function getThreadPosts(
  threadId: string
): Promise<(Post & { id: string })[]> {
  const snap = await getDocs(
    query(
      collection(db, "posts"),
      where("threadId", "==", threadId),
      orderBy("threadIndex", "asc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post & { id: string }));
}

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
        .filter((p) => !p.authorBanned)
        .map((p) => ({ ...p, benefitsCount: p.benefitsCount ?? p.likesCount ?? 0 }))
    )
  );
}
