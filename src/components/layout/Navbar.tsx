"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, Bell, LogOut, User, Settings, ChevronRight } from "lucide-react";
import { Avatar }           from "@/components/ui/Avatar";
import { useAuthStore }     from "@/store/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import { logout }           from "@/services/authService";
import { cn }               from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import toast                from "react-hot-toast";

export function Navbar() {
  const { user, profile }           = useAuthStore();
  const { unreadCount }             = useNotifications();
  const router                      = useRouter();
  const pathname                    = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setProfileOpen(false);
    await logout();
    toast.success("Logged out successfully");
    router.push("/login");
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    } else {
      router.push("/search");
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">

        {/* Site name — left */}
        <Link
          href="/"
          className="flex items-center gap-2 flex-shrink-0 select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm leading-none">U</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-[15px] tracking-tight">
            UmmahNet
          </span>
        </Link>

        {/* Search bar — center, grows to fill space */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-sm mx-auto"
        >
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200",
              searchFocused
                ? "bg-white dark:bg-gray-800 ring-2 ring-primary-500 shadow-sm"
                : "bg-gray-100 dark:bg-gray-800"
            )}
          >
            <Search
              className={cn(
                "w-4 h-4 flex-shrink-0 transition-colors",
                searchFocused ? "text-primary-500" : "text-gray-400"
              )}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search UmmahNet..."
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200
                         placeholder:text-gray-400 outline-none min-w-0"
            />
          </div>
        </form>

        {/* Right controls */}
        <div className="flex items-center gap-1 flex-shrink-0">

          {/* Notification bell */}
          <Link
            href="/notifications"
            className={cn(
              "relative p-2.5 rounded-xl transition-colors",
              pathname === "/notifications"
                ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5
                           bg-red-500 text-white text-[10px] font-bold rounded-full
                           flex items-center justify-center leading-none"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* Profile avatar + dropdown */}
          {user && profile ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileOpen((prev) => !prev)}
                className={cn(
                  "rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1",
                  "transition-opacity hover:opacity-90"
                )}
                aria-label="Account menu"
                aria-expanded={profileOpen}
              >
                <Avatar src={profile.photoURL} name={profile.displayName} size="sm" />
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <div
                  className="absolute right-0 top-11 w-56 bg-white dark:bg-gray-900
                             rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800
                             overflow-hidden z-50"
                >
                  {/* Profile summary */}
                  <Link
                    href={`/profile/${user.uid}`}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5
                               hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Avatar src={profile.photoURL} name={profile.displayName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {profile.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </Link>

                  <div className="border-t border-gray-100 dark:border-gray-800" />

                  {/* Settings */}
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm
                               text-gray-700 dark:text-gray-300
                               hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    Settings
                  </Link>

                  <div className="border-t border-gray-100 dark:border-gray-800" />

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm
                               text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                               transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary text-sm">
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
