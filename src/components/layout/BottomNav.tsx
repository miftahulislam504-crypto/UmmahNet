"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, Plus, MessageCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuthStore }  from "@/store/authStore";
import { useCreatePost } from "@/hooks/usePosts";
import type { Post }     from "@/types";

const tabs = [
  { href: "/",         icon: Home,          label: "Home"     },
  { href: "/friends",  icon: Users,          label: "Friends"  },
  //  center post button handled separately
  { href: "/messages", icon: MessageCircle,  label: "Messages" },
  { href: "/settings", icon: Settings,       label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const { profile } = useAuthStore();
  const createPost  = useCreatePost();

  const [showModal, setShowModal]   = useState(false);
  const [content,   setContent]     = useState("");
  const [posting,   setPosting]     = useState(false);
  const [visibility, setVisibility] = useState<Post["visibility"]>("public");

  async function handlePost() {
    if (!content.trim() || posting) return;
    setPosting(true);
    try {
      { content: content.trim(), files: [], visibility }
      setContent("");
      setShowModal(false);
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50
                   bg-white dark:bg-gray-900
                   border-t border-gray-100 dark:border-gray-800
                   h-16 flex items-center justify-around px-2
                   safe-area-bottom"
      >
        {/* Home */}
        <NavTab href="/" icon={Home} label="Home" active={pathname === "/"} />

        {/* Friends */}
        <NavTab href="/friends" icon={Users} label="Friends" active={pathname === "/friends"} />

        {/* Center post button */}
        <button
          onClick={() => setShowModal(true)}
          aria-label="Create post"
          className="flex items-center justify-center
                     w-12 h-12 rounded-2xl
                     bg-primary-600 hover:bg-primary-700
                     text-white shadow-md shadow-primary-600/30
                     transition-all duration-200 active:scale-95
                     -mt-4"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Messages */}
        <NavTab href="/messages" icon={MessageCircle} label="Messages" active={pathname === "/messages"} />

        {/* Settings */}
        <NavTab href="/settings" icon={Settings} label="Settings" active={pathname === "/settings"} />
      </nav>

      {/* Quick post modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center
                     bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-gray-900
                       rounded-t-3xl px-4 pt-4 pb-8
                       border-t border-gray-100 dark:border-gray-800
                       shadow-xl"
          >
            {/* Handle bar */}
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Create Post
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-sm text-gray-500 hover:text-gray-700
                           dark:hover:text-gray-300 transition-colors px-2 py-1"
              >
                Cancel
              </button>
            </div>

            {/* Profile row */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30
                              flex items-center justify-center text-primary-700
                              dark:text-primary-300 font-semibold text-sm flex-shrink-0">
                {profile?.displayName?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">
                  {profile?.displayName}
                </p>
                {/* Visibility picker */}
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as Post["visibility"])}
                  className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800
                             rounded-lg px-1.5 py-0.5 mt-1 border-none outline-none
                             cursor-pointer"
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends</option>
                  <option value="private">Only me</option>
                </select>
              </div>
            </div>

            {/* Text area */}
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={5}
              className="w-full resize-none bg-transparent text-gray-800 dark:text-gray-100
                         text-[15px] leading-relaxed placeholder:text-gray-400
                         outline-none mb-4"
            />

            {/* Post button */}
            <button
              onClick={handlePost}
              disabled={!content.trim() || posting}
              className="w-full py-3 rounded-2xl bg-primary-600 hover:bg-primary-700
                         text-white font-semibold text-sm
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all duration-200 active:scale-[0.98]"
            >
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Single tab item
function NavTab({
  href,
  icon: Icon,
  label,
  active,
}: {
  href:   string;
  icon:   React.ElementType;
  label:  string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-0.5
                 w-14 h-full transition-colors"
      aria-label={label}
    >
      <Icon
        className={cn(
          "w-6 h-6 transition-all duration-200",
          active
            ? "text-primary-600 stroke-[2.5]"
            : "text-gray-400 dark:text-gray-500 stroke-[1.8]"
        )}
      />
      <span
        className={cn(
          "text-[10px] font-medium tracking-wide transition-colors",
          active
            ? "text-primary-600"
            : "text-gray-400 dark:text-gray-500"
        )}
      >
        {label}
      </span>
    </Link>
  );
}
