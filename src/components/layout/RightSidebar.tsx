"use client";

import { useEffect, useState } from "react";
import Link                    from "next/link";
import {
  collection, getDocs, query, where, limit, orderBy,
} from "firebase/firestore";
import { db }           from "@/lib/firebase/config";
import { Avatar }       from "@/components/ui/Avatar";
import { FriendButton } from "@/components/friends/FriendButton";
import { useAuthStore } from "@/store/authStore";
import type { UserProfile } from "@/types";

export function RightSidebar() {
  const { user }                  = useAuthStore();
  const [suggested, setSuggested] = useState<UserProfile[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function fetchSuggested() {
      try {
        const q    = query(
          collection(db, "users"),
          where("uid", "!=", user!.uid),
          orderBy("uid"),
          limit(5)
        );
        const snap = await getDocs(q);
        setSuggested(snap.docs.map((d) => d.data() as UserProfile));
      } catch {
        setSuggested([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSuggested();
  }, [user]);

  return (
    <aside className="hidden xl:flex flex-col gap-3 w-60 sticky top-[72px] h-[calc(100vh-5rem)] overflow-y-auto pb-6">

      {/* People you may know */}
      <div className="card p-4">
        <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3">
          চিনতে পারেন?
        </h3>

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-1">
                  <div className="skeleton h-3 w-3/4 rounded" />
                  <div className="skeleton h-2 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && suggested.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-2">
            কোনো সাজেশন নেই
          </p>
        )}

        {!loading && suggested.length > 0 && (
          <div className="flex flex-col gap-3">
            {suggested.map((person) => (
              <div key={person.uid} className="flex items-center gap-2.5">
                <Avatar src={person.photoURL} name={person.displayName} size="sm" />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${person.uid}`}
                    className="text-sm font-medium text-gray-200 hover:text-primary-300
                               transition-colors truncate block"
                  >
                    {person.displayName}
                  </Link>
                  <p className="text-xs text-gray-500 truncate">@{person.username}</p>
                </div>
                <FriendButton theirUid={person.uid} size="sm" />
              </div>
            ))}
          </div>
        )}

        <Link
          href="/friends"
          className="mt-3 block text-center text-xs text-primary-400
                     hover:text-primary-300 transition-colors font-medium"
        >
          আরো দেখুন →
        </Link>
      </div>

      {/* Trending tags placeholder */}
      <div className="card p-4">
        <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3">
          ট্রেন্ডিং
        </h3>
        <div className="flex flex-wrap gap-2">
          {["#Engineering", "#Quran", "#Bangladesh", "#Islam", "#Tech"].map((tag) => (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}`}
              className="badge text-[11px] hover:bg-primary-600/30 transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-2">
        <p className="text-[11px] text-gray-600 leading-relaxed">
          <Link href="/about"   className="hover:text-gray-400 transition-colors">About</Link>
          {" · "}
          <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
          {" · "}
          <Link href="/terms"   className="hover:text-gray-400 transition-colors">Terms</Link>
        </p>
        <p className="text-[11px] text-gray-600 mt-1">© 2025 UmmahNet</p>
      </div>
    </aside>
  );
}
