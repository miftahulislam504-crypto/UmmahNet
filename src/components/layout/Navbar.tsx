"use client";
import React from "react";

import Link                              from "next/link";
import Image                             from "next/image";
import { useRouter, usePathname }        from "next/navigation";
import { Search, Bell, X, Sun, Moon }    from "lucide-react";
import { Avatar }                        from "@/components/ui/Avatar";
import { useAuthStore }                  from "@/store/authStore";
import { useNotifications }              from "@/hooks/useNotifications";
import { cn }                            from "@/lib/utils";
import { useState, useRef, useEffect }   from "react";

export function Navbar() {
  const { user, profile }              = useAuthStore();
  const { unreadCount }                = useNotifications();
  const router                         = useRouter();
  const pathname                       = usePathname();
  const [searchOpen,  setSearchOpen]   = useState(false);
  const [searchQuery, setSearchQuery]  = useState("");
  const [darkMode,    setDarkMode]     = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  function toggleTheme() {
    const html = document.documentElement;
    const isLight = html.classList.contains("light");
    html.classList.toggle("light", !isLight);
    setDarkMode(isLight);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
    setSearchQuery("");
    setSearchOpen(false);
  }

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background:       "rgba(15,13,26,0.75)",
        backdropFilter:   "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        borderBottom:     "1px solid rgba(255,255,255,0.07)",
        boxShadow:        "0 1px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.25)",
      }}
    >
      <div className="max-w-6xl mx-auto px-3 h-14 flex items-center gap-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "rgba(124,58,237,0.3)", filter: "blur(8px)" }}
            />
            <Image
              src="/logo.png"
              alt="UmmahNet"
              width={32}
              height={32}
              className="rounded-xl relative z-10 flex-shrink-0"
              priority
            />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-gradient hidden sm:block">
            UmmahNet
          </span>
        </Link>

        <div className="flex-1" />

        {/* Right controls */}
        <div className="flex items-center gap-1 flex-shrink-0">

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-200 transition-colors"
            style={{ background: "rgba(255,255,255,0.05)" }}
            aria-label="Search"
          >
            <Search className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-200 transition-colors"
            style={{ background: "rgba(255,255,255,0.05)" }}
            aria-label="Toggle theme"
          >
            {darkMode
              ? <Sun  className="w-[18px] h-[18px]" />
              : <Moon className="w-[18px] h-[18px]" />
            }
          </button>

          {/* Notifications */}
          <Link
            href="/notifications"
            className={cn(
              "relative p-2 rounded-xl transition-all duration-200",
              pathname === "/notifications"
                ? "text-primary-400"
                : "text-gray-400 hover:text-gray-200"
            )}
            style={{ background: "rgba(255,255,255,0.05)" }}
            aria-label="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5
                           text-white text-[9px] font-bold rounded-full
                           flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* Avatar */}
          {user && profile ? (
            <Link
              href={`/profile/${user.uid}`}
              className="rounded-full ring-2 ring-primary-600/40 hover:ring-primary-500/70
                         transition-all duration-200 focus:outline-none focus:ring-primary-500"
              aria-label="My profile"
            >
              <Avatar src={profile.photoURL} name={profile.displayName} size="sm" />
            </Link>
          ) : (
            <Link href="/login" className="btn-primary text-sm py-1.5 px-3">
              লগইন
            </Link>
          )}
        </div>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="absolute inset-x-0 top-0 h-14 flex items-center gap-2 px-3 z-10"
          style={{
            background:     "rgba(15,13,26,0.95)",
            backdropFilter: "blur(20px)",
          }}
        >
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 input py-0 h-9">
            <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="UmmahNet-এ খুঁজুন..."
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder:text-gray-500 outline-none"
            />
          </form>
          <button
            onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
            className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </header>
  );
}
