"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Avatar }       from "@/components/ui/Avatar";
import { FriendButton } from "@/components/friends/FriendButton";
import { useAuthStore } from "@/store/authStore";
import type { UserProfile } from "@/types";

// BUG 4 FIX: previously a hardcoded fake UID ("1", "2", "3") was used.
// This caused failed Firestore queries on every page load.
// Now real users are fetched from Firestore.
export function RightSidebar() {
  const { user }                          = useAuthStore();
  const [suggested, setSuggested]         = useState<UserProfile[]>([]);
  const [loading,   setLoading]           = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchSuggested() {
      try {
        // Show recent users, excluding self
        const q    = query(
          collection(db, "users"),
          where("uid", "!=", user!.uid),
          orderBy("uid"),
          limit(5)
        );
        const snap = await getDocs(q);
        setSuggested(snap.docs.map((d) => d.data() as UserProfile));
      } catch {
        // Silently fail — sidebar non-critical
        setSuggested([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSuggested();
  }, [user]);

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-64 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto pb-6">

      {/* Suggested Friends */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
          People you may know
        </h3>

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && suggested.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">
            No suggestions yet
          </p>
        )}

        {!loading && suggested.length > 0 && (
          <div className="flex flex-col gap-3">
            {suggested.map((person) => (
              <div key={person.uid} className="flex items-center gap-2">
                <Avatar src={person.photoURL} name={person.displayName} size="sm" />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${person.uid}`}
                    className="text-sm font-medium text-gray-900 dark:text-white hover:underline truncate block"
                  >
                    {person.displayName}
                  </Link>
                  <p className="text-xs text-gray-500">@{person.username}</p>
                </div>
                <FriendButton theirUid={person.uid} size="sm" />
              </div>
            ))}
          </div>
        )}

        <Link
          href="/friends"
          className="mt-3 block text-center text-xs text-primary-600 hover:underline font-medium"
        >
          See more
        </Link>
      </div>

      {/* Footer links */}
      <div className="px-2">
        <p className="text-xs text-gray-400 dark:text-gray-600 leading-relaxed">
          <Link href="/about"   className="hover:underline">About</Link>
          {" · "}
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          {" · "}
          <Link href="/terms"   className="hover:underline">Terms</Link>
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
          © 2025 UmmahNet
        </p>
      </div>
    </aside>
  );
}
