"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  unfriend,
  getPendingRequests,
  getSentRequests,
  getFriends,
  getRelationStatus,
  searchUsers,
  type RelationStatus,
} from "@/services/friendService";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

// ─── Relation status for a single user ────────────────────────────────────────
export function useRelationStatus(theirUid: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["relation", user?.uid, theirUid],
    queryFn:  () => getRelationStatus(user!.uid, theirUid),
    enabled:  !!user && !!theirUid,
    staleTime: 1000 * 30,
  });
}

// ─── Friend action buttons ─────────────────────────────────────────────────────
export function useFriendActions(theirUid: string) {
  const { user }   = useAuthStore();
  const qc         = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["relation", user?.uid, theirUid] });

  const send = useMutation({
    mutationFn: () => sendFriendRequest(user!.uid, theirUid),
    onSuccess:  () => { toast.success("Friend request sent"); invalidate(); },
    onError:    () => toast.error("Failed to send request"),
  });

  const accept = useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId),
    onSuccess:  () => {
      toast.success("Friend request accepted 🎉");
      invalidate();
      qc.invalidateQueries({ queryKey: ["pendingRequests"] });
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: () => toast.error("Failed to accept"),
  });

  const reject = useMutation({
    mutationFn: (requestId: string) => rejectFriendRequest(requestId),
    onSuccess:  () => {
      toast.success("Request declined");
      invalidate();
      qc.invalidateQueries({ queryKey: ["pendingRequests"] });
    },
    onError: () => toast.error("Failed"),
  });

  const cancel = useMutation({
    mutationFn: (requestId: string) => cancelFriendRequest(requestId),
    onSuccess:  () => { toast.success("Request cancelled"); invalidate(); },
    onError:    () => toast.error("Failed to cancel"),
  });

  const remove = useMutation({
    mutationFn: () => unfriend(user!.uid, theirUid),
    onSuccess:  () => {
      toast.success("Removed from friends");
      invalidate();
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: () => toast.error("Failed to remove"),
  });

  return { send, accept, reject, cancel, remove };
}

// ─── Pending requests list ─────────────────────────────────────────────────────
export function usePendingRequests() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["pendingRequests", user?.uid],
    queryFn:  () => getPendingRequests(user!.uid),
    enabled:  !!user,
  });
}

// ─── Friends list ─────────────────────────────────────────────────────────────
// BUG 5 FIX: getFriends now takes lastDoc1 and lastDoc2 separately.
// On the first page load, undefined is passed, which is correct.
export function useFriends(uid?: string) {
  const { user } = useAuthStore();
  const targetUid = uid ?? user?.uid;

  return useQuery({
    queryKey: ["friends", targetUid],
    queryFn:  () => getFriends(targetUid!),
    enabled:  !!targetUid,
    select:   (data) => data, // data.friends, data.lastDoc1, data.lastDoc2
  });
}

// ─── User search ──────────────────────────────────────────────────────────────
export function useUserSearch() {
  const { user }    = useAuthStore();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchUsers>>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!term.trim() || !user) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchUsers(term, user.uid);
        setResults(res);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [term, user]);

  return { term, setTerm, results, loading };
}
