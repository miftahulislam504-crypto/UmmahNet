"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  subscribeToStories,
  createStory,
  viewStory,
  type StoryGroup,
} from "@/services/storyService";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

export function useStories() {
  const { user }                        = useAuthStore();
  const [groups,  setGroups]            = useState<StoryGroup[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error,   setError]             = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const unsub = subscribeToStories(
      (data) => {
        if (user) {
          // mark hasUnviewed
          const enriched = data.map((g) => ({
            ...g,
            hasUnviewed: g.stories.some((s) => !s.viewerIds.includes(user.uid)),
          }));
          // own stories first
          enriched.sort((a, b) =>
            a.authorId === user.uid ? -1 : b.authorId === user.uid ? 1 : 0
          );
          setGroups(enriched);
        } else {
          setGroups(data);
        }
        setLoading(false);
      },
      // BUG FIX: surface the error instead of leaving loading=true forever
      () => {
        setError("Stories লোড করা যায়নি");
        setLoading(false);
      }
    );
    return () => unsub();
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
    onSuccess: () => toast.success("Story published ✅"),
    onError:   (err: any) => toast.error(err?.message ?? "Story upload failed"),
  });
}
