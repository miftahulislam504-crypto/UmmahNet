"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { getUserProfile } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { backfillSearchTokens } from "@/services/advancedService";

export function useAuth() {
  const { user, profile, loading, setUser, setProfile, setLoading, reset } =
    useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const p = await getUserProfile(firebaseUser.uid);
        setProfile(p);
        // Phase 4: ensure this user's doc has searchTokens (idempotent)
        backfillSearchTokens(firebaseUser.uid);
      } else {
        reset();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setLoading, reset]);

  return { user, profile, loading };
}
