"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import {
  createPost,
  deletePost,
  toggleLike,
  isLikedByUser,
  addComment,
  deleteComment,
  subscribeToComments,
  getPublicFeed,
  getFriendFeed,
  getUserPosts,
} from "@/services/postService";
import { useAuthStore } from "@/store/authStore";
import type { Post, Comment } from "@/types";
import toast from "react-hot-toast";

type FeedPageParam = QueryDocumentSnapshot | undefined;

// ─── Feed with infinite scroll ────────────────────────────────────────────────
// BUG 3 FIX: was calling getPublicFeed() which returned ALL public posts from
// every user on the platform. Changed to getFriendFeed() which only returns
// posts from friends + the current user's own posts.
export function useFeed() {
  const { user } = useAuthStore();

  return useInfiniteQuery<
    Awaited<ReturnType<typeof getFriendFeed>>,
    Error,
    { pages: Awaited<ReturnType<typeof getFriendFeed>>[]; pageParams: FeedPageParam[] },
    string[],
    FeedPageParam
  >({
    queryKey:         ["feed", user?.uid ?? ""],
    queryFn:          async ({ pageParam }) => getFriendFeed(user!.uid, pageParam),
    initialPageParam: undefined as FeedPageParam,
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    enabled:          !!user,
  });
}

// ─── User posts ───────────────────────────────────────────────────────────────
// PHASE 6: `viewerRelation` determines which visibilities are included —
// see getUserPosts() in postService.ts. Included in the query key so the
// owner's own view (all posts) and a stranger's view (public only) never
// share a cache entry.
export function useUserPosts(
  uid?: string,
  viewerRelation: "owner" | "friend" | "stranger" = "stranger"
) {
  return useInfiniteQuery<
    Awaited<ReturnType<typeof getUserPosts>>,
    Error,
    { pages: Awaited<ReturnType<typeof getUserPosts>>[]; pageParams: FeedPageParam[] },
    (string | undefined)[],
    FeedPageParam
  >({
    queryKey:         ["userPosts", uid, viewerRelation],
    queryFn:          async ({ pageParam }) =>
      getUserPosts(uid!, pageParam, viewerRelation),
    initialPageParam: undefined as FeedPageParam,
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    enabled:          !!uid,
  });
}

// ─── Create post ──────────────────────────────────────────────────────────────
export function useCreatePost() {
  const { user, profile } = useAuthStore();
  const qc                = useQueryClient();

  return useMutation({
    mutationFn: ({
      content,
      files,
      visibility,
    }: {
      content:    string;
      files:      File[];
      visibility: Post["visibility"];
    }) =>
      createPost(
        user!.uid,
        profile!.displayName,
        profile!.photoURL ?? "",
        content,
        files,
        visibility
      ),
    onSuccess: () => {
      toast.success("Post published ✅");
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["userPosts", user?.uid] });
    },
    onError: () => toast.error("Failed to post"),
  });
}

// ─── Delete post ──────────────────────────────────────────────────────────────
export function useDeletePost() {
  const { user } = useAuthStore();
  const qc       = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId, user!.uid),
    onSuccess:  () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["userPosts", user?.uid] });
    },
    onError: () => toast.error("Failed to delete"),
  });
}

// ─── Like state ───────────────────────────────────────────────────────────────
export function useLike(postId: string, initialCount: number) {
  const { user }            = useAuthStore();
  const [liked, setLiked]   = useState(false);
  const [count, setCount]   = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    isLikedByUser(postId, user.uid).then(setLiked);
  }, [postId, user]);

  const toggle = useCallback(async () => {
    if (!user || loading) return;
    setLoading(true);
    // Optimistic update
    setLiked((prev) => !prev);
    setCount((prev) => liked ? prev - 1 : prev + 1);
    try {
      await toggleLike(postId, user.uid);
    } catch {
      // Revert on error
      setLiked((prev) => !prev);
      setCount((prev) => liked ? prev + 1 : prev - 1);
      toast.error("Failed");
    } finally {
      setLoading(false);
    }
  }, [postId, user, liked, loading]);

  return { liked, count, toggle, loading };
}

// ─── Comments ─────────────────────────────────────────────────────────────────
export function useComments(postId: string) {
  const { user, profile }     = useAuthStore();
  const [comments, setComments] = useState<(Comment & { id: string })[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToComments(postId, setComments);
    return () => unsub();
  }, [postId]);

  const submit = useCallback(async (content: string) => {
    if (!user || !profile || !content.trim()) return;
    setSubmitting(true);
    try {
      await addComment(postId, user.uid, profile.displayName, profile.photoURL, content);
    } catch {
      toast.error("Failed to comment");
    } finally {
      setSubmitting(false);
    }
  }, [postId, user, profile]);

  const remove = useCallback(async (commentId: string) => {
    try {
      await deleteComment(commentId, postId);
    } catch {
      toast.error("Failed to delete");
    }
  }, [postId]);

  return { comments, submit, remove, submitting };
}
