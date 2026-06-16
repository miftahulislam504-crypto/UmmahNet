"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleBlock, getHiddenRelations } from "@/services/advancedService";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

// ─── PHASE 6: hidden-relations (blocks, either direction) ─────────────────────
// Loaded once per session for the current user and cached. Feed, search and
// profile pages use `hiddenIds` to filter out anyone with a block
// relationship in either direction — if I blocked them OR they blocked me,
// their posts/profile shouldn't show up for me (and vice-versa).
export function useHiddenUsers() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey:  ["hiddenRelations", user?.uid],
    queryFn:   () => getHiddenRelations(user!.uid),
    enabled:   !!user,
    staleTime: 1000 * 60, // block lists change rarely — 1 min is plenty
  });

  const blockedByMe = useMemo(() => new Set(data?.blockedByMe ?? []), [data]);
  const blockedMe   = useMemo(() => new Set(data?.blockedMe   ?? []), [data]);
  const hiddenIds   = useMemo(
    () => new Set<string>([...blockedByMe, ...blockedMe]),
    [blockedByMe, blockedMe]
  );

  return { blockedByMe, blockedMe, hiddenIds, loading: isLoading };
}

// ─── PHASE 6: block / unblock a specific user ─────────────────────────────────
// On block, advancedService.toggleBlock() also removes any friendship and
// cancels pending friend requests between the two users — this hook just
// wires that up to the UI (toast + invalidate affected queries).
export function useToggleBlock(theirUid: string) {
  const { user } = useAuthStore();
  const qc       = useQueryClient();

  return useMutation({
    mutationFn: () => toggleBlock(user!.uid, theirUid),
    onSuccess: (nowBlocked: boolean) => {
      toast.success(nowBlocked ? "ব্লক করা হয়েছে" : "আনব্লক করা হয়েছে");
      qc.invalidateQueries({ queryKey: ["hiddenRelations", user?.uid] });
      qc.invalidateQueries({ queryKey: ["relation", user?.uid, theirUid] });
      qc.invalidateQueries({ queryKey: ["friends", user?.uid] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["userPosts", theirUid] });
    },
    onError: () => toast.error("ব্লক করা যায়নি, আবার চেষ্টা করুন"),
  });
}
