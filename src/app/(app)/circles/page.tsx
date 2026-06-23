"use client";
import React from "react";

import { useState }                from "react";
import Link                        from "next/link";
import { Plus, Search, Loader2 }   from "lucide-react";
import { CircleCard }              from "@/components/circles/CircleCard";
import { useDiscoverCircles, useMyCircles, useCircleSearch } from "@/hooks/useCircles";
import type { CircleCategory }     from "@/types/circle";
import { cn }                      from "@/lib/utils";

const CATEGORIES: { value: CircleCategory | "all"; label: string; emoji: string }[] = [
  { value: "all",         label: "সব",         emoji: "🌐" },
  { value: "engineering", label: "Engineering", emoji: "⚙️" },
  { value: "quran",       label: "Quran",       emoji: "📖" },
  { value: "family",      label: "Family",      emoji: "👨‍👩‍👧" },
  { value: "students",    label: "Students",    emoji: "🎓" },
  { value: "business",    label: "Business",    emoji: "💼" },
  { value: "language",    label: "Language",    emoji: "🌍" },
  { value: "technology",  label: "Technology",  emoji: "💻" },
  { value: "health",      label: "Health",      emoji: "❤️" },
  { value: "community",   label: "Community",   emoji: "🏘️" },
];

export default function CirclesPage() {
  const [tab,      setTab]      = useState<"discover" | "mine">("discover");
  const [category, setCategory] = useState<CircleCategory | "all">("all");
  const [query,    setQuery]    = useState("");

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useDiscoverCircles(category === "all" ? undefined : category);

  const { circles: myCircles, loading: myLoading } = useMyCircles();
  const { results, loading: searchLoading, search } = useCircleSearch();

  const allCircles = data?.pages.flatMap((p) => p.circles) ?? [];
  const showSearch = query.trim().length > 0;

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    search(e.target.value);
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Header */}
      <div className="card px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-xl text-gray-100">Circles</h1>
        <Link href="/circles/create" className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          তৈরি করুন
        </Link>
      </div>

      {/* Search */}
      <div className="card px-4 py-3">
        <div className="input flex items-center gap-2 py-2">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            value={query}
            onChange={handleSearch}
            placeholder="Circle খুঁজুন…"
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
          />
          {searchLoading && <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />}
        </div>
      </div>

      {/* Search results */}
      {showSearch && (
        <div className="flex flex-col gap-2">
          {results.length === 0 && !searchLoading && (
            <div className="card p-8 text-center text-gray-500 text-sm">কোনো Circle পাওয়া যায়নি</div>
          )}
          {results.map((c) => <CircleCard key={c.id} circle={c} variant="list" />)}
        </div>
      )}

      {!showSearch && (
        <>
          {/* Tabs */}
          <div className="card flex">
            {(["discover", "mine"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-3 text-sm font-semibold transition-all relative",
                  tab === t ? "text-primary-300" : "text-gray-500 hover:text-gray-400"
                )}
              >
                {t === "discover" ? "Discover" : "আমার Circles"}
                {tab === t && (
                  <span
                    className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                    style={{ background: "linear-gradient(90deg, #7c3aed, #9f67fa)" }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* ── Discover tab ── */}
          {tab === "discover" && (
            <>
              {/* Category filter */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-0.5">
                {CATEGORIES.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    onClick={() => setCategory(value)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                               flex-shrink-0 transition-all duration-200 active:scale-95"
                    style={{
                      color:      category === value ? "#c4b5fd" : "#6b7280",
                      background: category === value ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.05)",
                      border:     category === value
                        ? "1px solid rgba(124,58,237,0.4)"
                        : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span>{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>

              {/* Grid */}
              {isLoading && (
                <div className="grid grid-cols-2 gap-3">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="skeleton rounded-2xl h-52" />
                  ))}
                </div>
              )}

              {!isLoading && allCircles.length === 0 && (
                <div className="card p-12 text-center">
                  <p className="text-4xl mb-3">◎</p>
                  <p className="font-semibold text-gray-300">কোনো Circle নেই</p>
                  <p className="text-sm text-gray-500 mt-1">প্রথম Circle তৈরি করুন</p>
                </div>
              )}

              {!isLoading && allCircles.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {allCircles.map((circle) => (
                    <CircleCard key={circle.id} circle={circle} />
                  ))}
                </div>
              )}

              {hasNextPage && (
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="btn-ghost w-full flex items-center justify-center gap-2"
                >
                  {isFetchingNextPage
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : "আরো দেখুন"
                  }
                </button>
              )}
            </>
          )}

          {/* ── My Circles tab ── */}
          {tab === "mine" && (
            <div className="flex flex-col gap-2">
              {myLoading && (
                <div className="card p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-400 mx-auto" />
                </div>
              )}

              {!myLoading && myCircles.length === 0 && (
                <div className="card p-12 text-center">
                  <p className="text-4xl mb-3">◎</p>
                  <p className="font-semibold text-gray-300">কোনো Circle-এ নেই</p>
                  <p className="text-sm text-gray-500 mt-1">Discover থেকে Circle খুঁজুন</p>
                </div>
              )}

              {!myLoading && myCircles.map((circle) => (
                <CircleCard key={circle.id} circle={circle} variant="list" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
