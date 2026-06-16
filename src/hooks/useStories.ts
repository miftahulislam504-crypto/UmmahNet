"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  subscribeToStories,
  createStory,
  viewStory,
  type StoryGroup,
} from "@/services/storyService";
import { getFriends, migrateLegacyFriendships } from "@/services/friendService";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

export function useStories() {
  const { user }                        = useAuthStore();
  const [groups,  setGroups]            = useState<StoryGroup[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error,   setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    let unsub: (() => void) | undefined;
    let cancelled = false;

    // BUG 6 FIX: if getFriends hangs (slow network, Firestore cold-start),
    // loading never becomes false and the StoryBar shows skeleton forever
    // then disappears when the component unmounts and remounts.
    // Safety valve: after 6 seconds, fall through with an empty friend list
    // so at least own stories are shown.
    const timeoutId = setTimeout(() => {
      if (cancelled || unsub) return; // already resolved
      console.warn("useStories: getFriends timed out, falling back to own stories only");
      if (!cancelled) {
        unsub = subscribeToStories(
          user.uid,
          [],
          (data) => {
            const enriched = data.map((g) => ({
              ...g,
              hasUnviewed: g.stories.some((s) => !s.viewerIds.includes(user.uid)),
            }));
            enriched.sort((a, b) =>
              a.authorId === user.uid ? -1 : b.authorId === user.uid ? 1 : 0
            );
            setGroups(enriched);
            setLoading(false);
          },
          (err: any) => {
            setError(`${err?.code ?? "error"}: ${err?.message ?? String(err)}`);
            setLoading(false);
          }
        );
      }
    }, 6000);

    (async () => {
      // BUG 6 FIX: migrateLegacyFriendships was fire-and-forget but if it
      // throws an unhandled promise rejection it can abort the whole async
      // IIFE in some JS engines. Wrap it safely.
      try { migrateLegacyFriendships(user.uid); } catch { /* ignore */ }

      let friendUids: string[] = [];
      try {
        const { friends } = await getFriends(user.uid, 100);
        friendUids = friends.map((f) => f.uid);
      } catch (err) {
        console.error("getFriends failed:", err);
        // Continue with empty list — own stories still show
      }

      clearTimeout(timeoutId); // cancel the safety-valve timer
      if (cancelled) return;

      unsub = subscribeToStories(
        user.uid,
        friendUids,
        (data) => {
          const enriched = data.map((g) => ({
            ...g,
            hasUnviewed: g.stories.some((s) => !s.viewerIds.includes(user.uid)),
          }));
          enriched.sort((a, b) =>
            a.authorId === user.uid ? -1 : b.authorId === user.uid ? 1 : 0
          );
          setGroups(enriched);
          setLoading(false);
        },
        (err: any) => {
          setError(`${err?.code ?? "error"}: ${err?.message ?? String(err)}`);
          setLoading(false);
        }
      );
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      unsub?.();
    };
  }, [user]);

  const markViewed = useCallback(
    async (storyId: string) => {
      if (!user) return;
      await viewStory(storyId, user.uid);
    },
    [user]
  );

  return { groups, loading, error, markViewed };
}

export function useCreateStory() {
  const { user, profile } = useAuthStore();

  return useMutation({
    mutationFn: ({ file, caption }: { file: File; caption: string }) =>
      createStory(
        user!.uid,
        profile!.displayName,
        profile!.photoURL ?? "",
        file,
        caption
      ),
    onSuccess: () => toast.success("স্টোরি প্রকাশিত হয়েছে ✅"),
    onError:   (err: any) => toast.error(err?.message ?? "স্টোরি আপলোড ব্যর্থ হয়েছে"),
  });
}
