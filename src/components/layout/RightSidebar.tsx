"use client";

import Link from "next/link";
import { Avatar }       from "@/components/ui/Avatar";
import { FriendButton } from "@/components/friends/FriendButton";

// Placeholder — Phase 2 real suggested friends আসবে Firestore থেকে
const suggested = [
  { uid: "1", displayName: "Rahim Uddin",   username: "rahim",  photoURL: "" },
  { uid: "2", displayName: "Fatema Begum",  username: "fatema", photoURL: "" },
  { uid: "3", displayName: "Karim Hossain", username: "karim",  photoURL: "" },
];

export function RightSidebar() {
  return (
    <aside className="hidden xl:flex flex-col gap-4 w-64 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto pb-6">

      {/* Suggested Friends */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
          পরিচিত হতে পারেন
        </h3>
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
        <Link
          href="/friends"
          className="mt-3 block text-center text-xs text-primary-600 hover:underline font-medium"
        >
          আরও দেখুন
        </Link>
      </div>

      {/* Footer links */}
      <div className="px-2">
        <p className="text-xs text-gray-400 dark:text-gray-600 leading-relaxed">
          <Link href="/about"   className="hover:underline">সম্পর্কে</Link>
          {" · "}
          <Link href="/privacy" className="hover:underline">গোপনীয়তা</Link>
          {" · "}
          <Link href="/terms"   className="hover:underline">শর্তাবলী</Link>
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
          © 2025 UmmahNet
        </p>
      </div>
    </aside>
  );
}
