"use client";

import { useState, useEffect, useCallback } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCircle,
  getDiscoverCircles,
  getMyCircles,
  getCircle,
  subscribeToCircle,
  isMember,
  getMemberRole,
  joinCircle,
  leaveCircle,
  getCircleMembers,
  getCircleFeed,
  updateCircle,
  promoteMember,
  searchCircles,
} from "@/services/circleService";
import { useAuthStore } from "@/store/authStore";
import type { Circle, CircleCategory, CircleMember } from "@/types/circle";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";

// ─── Discover Circles (paginated) ─────────────────────────────────────────────
export function useDiscoverCircles(category?: CircleCategory) {
  return useInfiniteQuery({
    queryKey:         ["circles", "discover", category ?? "all"],
    queryFn:          ({ pageParam }) =>
      getDiscoverCircles(category, pageParam as QueryDocumentSnapshot | undefined),
    initialPageParam: undefined as QueryDocumentSnapshot | undefined,
    getNextPageParam: (last) => last.lastDoc ?? undefined,
  });
}

// ─── My Circles ───────────────────────────────────────────────────────────────
export function useMyCircles() {
  const { user }                  = useAuthStore();
  const [circles, setCircles]     = useState<(Circle & { id: string })[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getMyCircles(user.uid)
      .then(setCircles)
      .catch(() => setCircles([]))
      .finally(() => setLoading(false));
  }, [user]);

  return { circles, loading };
}

// ─── Single Circle ────────────────────────────────────────────────────────────
export function useCircle(circleId?: string) {
  const [circle,  setCircle]  = useState<(Circle & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!circleId) return;
    setLoading(true);
    const unsub = subscribeToCircle(circleId, (c) => {
      setCircle(c);
      setLoading(false);
    });
    return () => unsub();
  }, [circleId]);

  return { circle, loading };
}

// ─── Membership state ─────────────────────────────────────────────────────────
export function useCircleMembership(circleId?: string) {
  const { user }              = useAuthStore();
  const [joined,  setJoined]  = useState(false);
  const [role,    setRole]    = useState<"owner" | "moderator" | "member" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!circleId || !user) { setLoading(false); return; }
    Promise.all([
      isMember(circleId, user.uid),
      getMemberRole(circleId, user.uid),
    ]).then(([mem, r]) => {
      setJoined(mem);
      setRole(r);
    }).finally(() => setLoading(false));
  }, [circleId, user]);

  return { joined, role, loading, setJoined, setRole };
}

// ─── Join / Leave ─────────────────────────────────────────────────────────────
export function useJoinCircle(circle: (Circle & { id: string }) | null) {
  const { user, profile }               = useAuthStore();
  const qc                              = useQueryClient();
  const { joined, role, setJoined, setRole } = useCircleMembership(circle?.id);

  const join = useMutation({
    mutationFn: () =>
      joinCircle(
        circle!.id,
        user!.uid,
        profile!.displayName,
        profile!.photoURL ?? "",
        circle!.isPrivate
      ),
    onSuccess: (result) => {
      if (result === "joined") {
        setJoined(true);
        setRole("member");
        toast.success(`${circle?.name}-এ যোগ দিয়েছেন ✨`);
      } else {
        toast.success("যোগ দেওয়ার অনুরোধ পাঠানো হয়েছে");
      }
      qc.invalidateQueries({ queryKey: ["circles"] });
    },
    onError: () => toast.error("যোগ দেওয়া যায়নি"),
  });

  const leave = useMutation({
    mutationFn: () => leaveCircle(circle!.id, user!.uid),
    onSuccess: () => {
      setJoined(false);
      setRole(null);
      toast.success("Circle ছেড়ে দিয়েছেন");
      qc.invalidateQueries({ queryKey: ["circles"] });
    },
    onError: () => toast.error("হয়নি"),
  });

  return { joined, role, join, leave };
}

// ─── Circle Members ───────────────────────────────────────────────────────────
export function useCircleMembers(circleId?: string) {
  const [members, setMembers]   = useState<(CircleMember & { id: string })[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!circleId) return;
    getCircleMembers(circleId)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [circleId]);

  const promote = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "moderator" | "member" }) =>
      promoteMember(circleId!, userId, role),
    onSuccess: () => {
      toast.success("Role আপডেট হয়েছে");
      getCircleMembers(circleId!).then(setMembers);
    },
  });

  return { members, loading, promote };
}

// ─── Circle Feed ──────────────────────────────────────────────────────────────
export function useCircleFeed(circleId?: string) {
  return useInfiniteQuery({
    queryKey:         ["circleFeed", circleId],
    queryFn:          ({ pageParam }) =>
      getCircleFeed(circleId!, pageParam as QueryDocumentSnapshot | undefined),
    initialPageParam: undefined as QueryDocumentSnapshot | undefined,
    getNextPageParam: (last) => last.lastDoc ?? undefined,
    enabled:          !!circleId,
  });
}

// ─── Create Circle ────────────────────────────────────────────────────────────
export function useCreateCircle() {
  const { user, profile } = useAuthStore();
  const qc                = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name:        string;
      description: string;
      category:    CircleCategory;
      isPrivate:   boolean;
      tags:        string[];
    }) => createCircle(user!.uid, profile!.displayName, data),
    onSuccess: () => {
      toast.success("Circle তৈরি হয়েছে ✨");
      qc.invalidateQueries({ queryKey: ["circles"] });
    },
    onError: () => toast.error("Circle তৈরি করা যায়নি"),
  });
}

// ─── Search Circles ───────────────────────────────────────────────────────────
export function useCircleSearch() {
  const [results,  setResults]  = useState<(Circle & { id: string })[]>([]);
  const [loading,  setLoading]  = useState(false);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      setResults(await searchCircles(term));
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, search };
}
