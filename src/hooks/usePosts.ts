"use client";

import { useState, useEffect, useCallback } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import {
  createPost,
  createThread,
  deletePost,
  toggleBenefit,
  isBenefitedByUser,
  votePoll,
  getPollVote,
  addComment,
  deleteComment,
  markAcceptedAnswer,
  subscribeToComments,
  getPublicFeed,
  getFriendFeed,
  getUserPosts,
  getThreadPosts,
} from "@/services/postService";
import { useAuthStore } from "@/store/authStore";
import type { Post, Comment, PostType } from "@/types";
import toast from "react-hot-toast";

type FeedPageParam = QueryDocumentSnapshot | undefined;

// ─── Feed ─────────────────────────────────────────────────────────────────────
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
    queryFn:          async ({ pageParam }) => getUserPosts(uid!, pageParam, viewerRelation),
    initialPageParam: undefined as FeedPageParam,
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    enabled:          !!uid,
  });
}

// ─── Thread posts ─────────────────────────────────────────────────────────────
export function useThreadPosts(threadId?: string) {
  const [posts,   setPosts]   = useState<(Post & { id: string })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!threadId) return;
    setLoading(true);
    getThreadPosts(threadId)
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [threadId]);

  return { posts, loading };
}

// ─── Create post (Phase 12: extended options) ─────────────────────────────────
export function useCreatePost() {
  const { user, profile } = useAuthStore();
  const qc                = useQueryClient();

  return useMutation({
    mutationFn: ({
      content,
      files,
      visibility,
      type,
      pollOptions,
      articleTitle,
      quotedPostId,
      quotedContent,
      quotedAuthorName,
    }: {
      content:    string;
      files:      File[];
      visibility: Post["visibility"];
      type?:      PostType;
      pollOptions?:      string[];
      articleTitle?:     string;
      quotedPostId?:     string;
      quotedContent?:    string;
      quotedAuthorName?: string;
    }) =>
      createPost(
        user!.uid,
        profile!.displayName,
        profile!.photoURL ?? "",
        content,
        files,
        visibility,
        { type, pollOptions, articleTitle, quotedPostId, quotedContent, quotedAuthorName }
      ),
    onSuccess: () => {
      toast.success("পোস্ট হয়েছে ✨");
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["userPosts", user?.uid] });
    },
    onError: () => toast.error("পোস্ট করা যায়নি"),
  });
}

// ─── Create Thread (Phase 12) ─────────────────────────────────────────────────
export function useCreateThread() {
  const { user, profile } = useAuthStore();
  const qc                = useQueryClient();

  return useMutation({
    mutationFn: ({
      parts,
      visibility,
    }: {
      parts:      string[];
      visibility: Post["visibility"];
    }) =>
      createThread(
        user!.uid,
        profile!.displayName,
        profile!.photoURL ?? "",
        parts,
        visibility
      ),
    onSuccess: () => {
      toast.success("Thread পোস্ট হয়েছে ✨");
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["userPosts", user?.uid] });
    },
    onError: () => toast.error("Thread পোস্ট করা যায়নি"),
  });
}

// ─── Delete post ──────────────────────────────────────────────────────────────
export function useDeletePost() {
  const { user } = useAuthStore();
  const qc       = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId, user!.uid),
    onSuccess:  () => {
      toast.success("মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["userPosts", user?.uid] });
    },
    onError: () => toast.error("মুছতে পারেনি"),
  });
}

// ─── Benefit state (Phase 12: replaces useLike) ───────────────────────────────
export function useLike(postId: string, initialCount: number) {
  const { user }              = useAuthStore();
  const [liked,   setLiked]   = useState(false);
  const [count,   setCount]   = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    isBenefitedByUser(postId, user.uid).then(setLiked);
  }, [postId, user]);

  const toggle = useCallback(async () => {
    if (!user || loading) return;
    setLoading(true);
    setLiked((prev) => !prev);
    setCount((prev) => liked ? prev - 1 : prev + 1);
    try {
      await toggleBenefit(postId, user.uid);
    } catch {
      setLiked((prev) => !prev);
      setCount((prev) => liked ? prev + 1 : prev - 1);
      toast.error("হয়নি");
    } finally {
      setLoading(false);
    }
  }, [postId, user, liked, loading]);

  return { liked, count, toggle, loading };
}

// ─── Poll voting (Phase 12) ───────────────────────────────────────────────────
export function usePollVote(postId: string) {
  const { user }                  = useAuthStore();
  const [myVote, setMyVote]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [checking, setChecking]   = useState(true);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    getPollVote(postId, user.uid)
      .then(setMyVote)
      .finally(() => setChecking(false));
  }, [postId, user]);

  const vote = useCallback(async (optionId: string) => {
    if (!user || loading || myVote) return;
    setLoading(true);
    try {
      await votePoll(postId, user.uid, optionId);
      setMyVote(optionId);
      toast.success("ভোট দেওয়া হয়েছে");
    } catch {
      toast.error("ভোট দেওয়া যায়নি");
    } finally {
      setLoading(false);
    }
  }, [postId, user, loading, myVote]);

  return { myVote, vote, loading, checking };
}

// ─── Comments / Reflections ───────────────────────────────────────────────────
export function useComments(postId: string) {
  const { user, profile }             = useAuthStore();
  const [comments, setComments]       = useState<(Comment & { id: string })[]>([]);
  const [submitting, setSubmitting]   = useState(false);

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
      toast.error("Reflection পোস্ট করা যায়নি");
    } finally {
      setSubmitting(false);
    }
  }, [postId, user, profile]);

  const remove = useCallback(async (commentId: string) => {
    try {
      await deleteComment(commentId, postId);
    } catch {
      toast.error("মুছতে পারেনি");
    }
  }, [postId]);

  // Phase 12: mark best answer on Question posts
  const acceptAnswer = useCallback(async (commentId: string) => {
    try {
      await markAcceptedAnswer(commentId, postId);
      toast.success("সেরা উত্তর চিহ্নিত হয়েছে ✅");
    } catch {
      toast.error("হয়নি");
    }
  }, [postId]);

  return { comments, submit, remove, acceptAnswer, submitting };
}
