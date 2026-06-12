"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Home, Search, Bell, MessageCircle, Users, Menu, X, LogOut } from "lucide-react";
import { Avatar }           from "@/components/ui/Avatar";
import { useAuthStore }     from "@/store/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import { logout }           from "@/services/authService";
import { cn }               from "@/lib/utils";
import { useState }         from "react";
import toast                from "react-hot-toast";

const navLinks = [
  { href: "/",              icon: Home,          label: "হোম"        },
  { href: "/friends",       icon: Users,          label: "বন্ধু"       },
  { href: "/messages",      icon: MessageCircle,  label: "মেসেজ"      },
  { href: "/notifications", icon: Bell,           label: "নোটিফিকেশন" },
  { href: "/search",        icon: Search,         label: "খুঁজুন"     },
];

export function Navbar() {
  const { user, profile }      = useAuthStore();
  const { unreadCount }        = useNotifications();
  const pathname               = usePathname();
  const router                 = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    toast.success("লগ আউট হয়েছে");
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">U</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-white hidden sm:block">UmmahNet</span>
        </Link>

        {/* Search bar desktop */}
        <Link
          href="/search"
          className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-gray-800
                     rounded-xl px-4 py-2 text-sm text-gray-500 w-64
                     hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>খুঁজুন...</span>
        </Link>

        {/* Nav icons desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl transition-all",
                "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800",
                pathname === href && "text-primary-600 bg-primary-50 dark:bg-primary-900/20"
              )}
              title={label}
            >
              <Icon className="w-5 h-5" />
              {href === "/notifications" && unreadCount > 0 && (
                <span className="absolute top-1.5 right-3.5 w-4 h-4 bg-red-500 text-white
                                 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user && profile ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <Avatar src={profile.photoURL} name={profile.displayName} size="sm" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-52 card shadow-lg z-50 overflow-hidden">
                  <Link
                    href={`/profile/${user.uid}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Avatar src={profile.photoURL} name={profile.displayName} size="sm" />
                    <div className="text-sm">
                      <p className="font-semibold">{profile.displayName}</p>
                      <p className="text-gray-500 text-xs">@{profile.username}</p>
                    </div>
                  </Link>
                  <hr className="border-gray-100 dark:border-gray-800" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500
                               hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    লগ আউট
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary text-sm">লগইন</Link>
          )}

          <button
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2">
          {navLinks.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                pathname === href
                  ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
              {href === "/notifications" && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
