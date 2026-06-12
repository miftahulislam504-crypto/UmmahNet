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
  getUserPosts,
} from "@/services/postService";
import { useAuthStore } from "@/store/authStore";
import type { Post, Comment } from "@/types";
import toast from "react-hot-toast";

// ─── Feed with infinite scroll ────────────────────────────────────────────────
export function useFeed() {
  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null);

  return useInfiniteQuery({
    queryKey:           ["feed"],
    queryFn:            async ({ pageParam }) => {
      const result = await getPublicFeed(pageParam as QueryDocumentSnapshot | undefined);
      lastDocRef.current = result.lastDoc;
      return result;
    },
    initialPageParam:   undefined,
    getNextPageParam:   (lastPage) => lastPage.lastDoc ?? undefined,
  });
}

// ─── User posts ───────────────────────────────────────────────────────────────
export function useUserPosts(uid?: string) {
  return useInfiniteQuery({
    queryKey:         ["userPosts", uid],
    queryFn:          async ({ pageParam }) =>
      getUserPosts(uid!, pageParam as QueryDocumentSnapshot | undefined),
    initialPageParam: undefined,
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
        profile!.photoURL,
        content,
        files,
        visibility
      ),
    onSuccess: () => {
      toast.success("পোস্ট প্রকাশিত হয়েছে ✅");
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["userPosts", user?.uid] });
    },
    onError: () => toast.error("পোস্ট করতে ব্যর্থ হয়েছে"),
  });
}

// ─── Delete post ──────────────────────────────────────────────────────────────
export function useDeletePost() {
  const { user } = useAuthStore();
  const qc       = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId, user!.uid),
    onSuccess:  () => {
      toast.success("পোস্ট মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["userPosts", user?.uid] });
    },
    onError: () => toast.error("মুছতে ব্যর্থ হয়েছে"),
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
      toast.error("ব্যর্থ হয়েছে");
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
      toast.error("মন্তব্য করতে ব্যর্থ হয়েছে");
    } finally {
      setSubmitting(false);
    }
  }, [postId, user, profile]);

  const remove = useCallback(async (commentId: string) => {
    try {
      await deleteComment(commentId, postId);
    } catch {
      toast.error("মুছতে ব্যর্থ হয়েছে");
    }
  }, [postId]);

  return { comments, submit, remove, submitting };
}
