"use client";

import { Search, Loader2, Users } from "lucide-react";
import { useUserSearch }  from "@/hooks/useFriends";
import { UserCard }       from "@/components/friends/UserCard";

export function FindPeopleTab() {
  const { term, setTerm, results, loading } = useUserSearch();

  return (
    <div className="flex flex-col gap-4">
      {/* Search box */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ইউজারনেম বা নাম দিয়ে খুঁজুন..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-10 pr-4 py-2.5
                       text-sm outline-none focus:ring-2 focus:ring-primary-500
                       border border-transparent focus:border-primary-500 transition-all"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>
      </div>

      {/* Results */}
      {term.trim() && !loading && results.length === 0 && (
        <div className="card p-10 text-center">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            "<span className="font-medium">{term}</span>" নামে কেউ পাওয়া যায়নি
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500 px-1">{results.length} জন পাওয়া গেছে</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {results.map((user) => (
              <UserCard key={user.uid} user={user} />
            ))}
          </div>
        </div>
      )}

      {!term && (
        <div className="card p-10 text-center">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            নাম বা ইউজারনেম টাইপ করুন
          </p>
        </div>
      )}
    </div>
  );
}
