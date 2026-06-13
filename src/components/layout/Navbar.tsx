"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, Bell, LogOut, Settings, X } from "lucide-react";
import { Avatar }           from "@/components/ui/Avatar";
import { useAuthStore }     from "@/store/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import { logout }           from "@/services/authService";
import { cn }               from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import toast                from "react-hot-toast";

export function Navbar() {
  const { user, profile }             = useAuthStore();
  const { unreadCount }               = useNotifications();
  const router                        = useRouter();
  const pathname                      = usePathname();
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  async function handleLogout() {
    await logout();
    toast.success("লগআউট সফল হয়েছে");
    router.push("/login");
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
    setSearchQuery("");
    setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="max-w-5xl mx-auto px-3 h-14 flex items-center gap-2">

        {/* Logo — নাম সবসময় দেখাবে */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-white font-bold text-sm leading-none">U</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-[15px] tracking-tight">
            UmmahNet
          </span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right controls */}
        <div className="flex items-center gap-1 flex-shrink-0">

          {/* Search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notification bell */}
          <Link
            href="/notifications"
            className={cn(
              "relative p-2 rounded-xl transition-colors",
              pathname === "/notifications"
                ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5
                               bg-red-500 text-white text-[10px] font-bold rounded-full
                               flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* Profile avatar — সরাসরি profile page এ যাবে */}
          {user && profile ? (
            <Link
              href={`/profile/${user.uid}`}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 transition-opacity hover:opacity-90"
              aria-label="আমার প্রোফাইল"
            >
              <Avatar src={profile.photoURL} name={profile.displayName} size="sm" />
            </Link>
          ) : (
            <Link href="/login" className="btn-primary text-sm">লগইন</Link>
          )}
        </div>
      </div>

      {/* Search overlay — full width */}
      {searchOpen && (
        <div className="absolute inset-x-0 top-0 h-14 bg-white dark:bg-gray-900
                        border-b border-gray-100 dark:border-gray-800
                        flex items-center gap-2 px-3 z-10">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search UmmahNet..."
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 outline-none"
            />
          </form>
          <button
            onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </header>
  );
}
