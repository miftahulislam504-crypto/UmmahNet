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
    onSuccess:  () => { toast.success("বন্ধু অনুরোধ পাঠানো হয়েছে"); invalidate(); },
    onError:    () => toast.error("অনুরোধ পাঠাতে ব্যর্থ হয়েছে"),
  });

  const accept = useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId),
    onSuccess:  () => {
      toast.success("বন্ধু অনুরোধ গ্রহণ করা হয়েছে 🎉");
      invalidate();
      qc.invalidateQueries({ queryKey: ["pendingRequests"] });
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: () => toast.error("গ্রহণ করতে ব্যর্থ হয়েছে"),
  });

  const reject = useMutation({
    mutationFn: (requestId: string) => rejectFriendRequest(requestId),
    onSuccess:  () => { toast.success("অনুরোধ প্রত্যাখ্যান করা হয়েছে"); invalidate(); qc.invalidateQueries({ queryKey: ["pendingRequests"] }); },
    onError:    () => toast.error("ব্যর্থ হয়েছে"),
  });

  const cancel = useMutation({
    mutationFn: (requestId: string) => cancelFriendRequest(requestId),
    onSuccess:  () => { toast.success("অনুরোধ বাতিল করা হয়েছে"); invalidate(); },
    onError:    () => toast.error("বাতিল করতে ব্যর্থ হয়েছে"),
  });

  const remove = useMutation({
    mutationFn: () => unfriend(user!.uid, theirUid),
    onSuccess:  () => {
      toast.success("বন্ধু তালিকা থেকে সরানো হয়েছে");
      invalidate();
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: () => toast.error("সরাতে ব্যর্থ হয়েছে"),
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
export function useFriends(uid?: string) {
  const { user } = useAuthStore();
  const targetUid = uid ?? user?.uid;

  return useQuery({
    queryKey: ["friends", targetUid],
    queryFn:  () => getFriends(targetUid!),
    enabled:  !!targetUid,
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
    }, 400); // debounce
    return () => clearTimeout(timer);
  }, [term, user]);

  return { term, setTerm, results, loading };
}
