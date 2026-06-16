"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Users } from "lucide-react";
import { searchUsers }  from "@/services/friendService";
import { UserCard }     from "@/components/friends/UserCard";
import { useAuthStore } from "@/store/authStore";
import type { UserProfile } from "@/types";

function SearchContent() {
  const searchParams          = useSearchParams();
  const router                = useRouter();
  const { user }              = useAuthStore();
  const [query, setQuery]     = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim() || !user) { setResults([]); setError(null); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await searchUsers(query, user.uid);
        setResults(res);
      } catch (err: any) {
        // BUG FIX: previously no catch — a permission/network error left
        // `results` empty with zero feedback, indistinguishable from a
        // genuine "no user found" — this surfaces the real cause.
        console.error("searchUsers error:", err);
        setError(
          err?.code === "permission-denied"
            ? "সার্চ করার অনুমতি নেই — Firestore rules চেক করুন"
            : "সার্চ করতে সমস্যা হয়েছে, আবার চেষ্টা করুন"
        );
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, user]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    router.replace(val ? `/search?q=${encodeURIComponent(val)}` : "/search");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            autoFocus
            type="text"
            placeholder="মানুষ বা পোস্ট খুঁজুন..."
            value={query}
            onChange={handleChange}
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-11 pr-4 py-3
                       text-sm outline-none focus:ring-2 focus:ring-primary-500
                       border border-transparent focus:border-primary-500 transition-all"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
          )}
        </div>
      </div>

      {/* People results */}
      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 px-1">
            মানুষ — {results.length} জন পাওয়া গেছে
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {results.map((u) => (
              <UserCard key={u.uid} user={u} />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="card p-8 text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {query.trim() && !loading && !error && results.length === 0 && (
        <div className="card p-12 text-center">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            "<span className="font-medium">{query}</span>" পাওয়া যায়নি
          </p>
        </div>
      )}

      {!query.trim() && (
        <div className="card p-12 text-center">
          <Search className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">খুঁজতে টাইপ করুন</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="card p-8 text-center text-gray-500">লোড হচ্ছে...</div>}>
      <SearchContent />
    </Suspense>
  );
}
