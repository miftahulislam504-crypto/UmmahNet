"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Users, MessageCircle, Bell, Bookmark,
  Settings, ChevronRight,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

const links = [
  { href: "/",           icon: Home,          label: "Home" },
  { href: "/friends",    icon: Users,          label: "Friends" },
  { href: "/messages",   icon: MessageCircle,  label: "Messages" },
  { href: "/notifications", icon: Bell,        label: "Notifications" },
  { href: "/saved",      icon: Bookmark,       label: "Saved posts" },
  { href: "/settings",   icon: Settings,       label: "Settings" },
];

export function LeftSidebar() {
  const { profile, user } = useAuthStore();
  const pathname          = usePathname();

  return (
    <aside className="hidden lg:flex flex-col gap-2 w-64 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto pb-6">
      {/* Profile card */}
      {profile && user && (
        <Link
          href={`/profile/${user.uid}`}
          className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-gray-100
                     dark:hover:bg-gray-800 transition-colors group"
        >
          <Avatar src={profile.photoURL} name={profile.displayName} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {profile.displayName}
            </p>
            <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </Link>
      )}

      <hr className="border-gray-100 dark:border-gray-800 my-1" />

      {/* Nav links */}
      <nav className="flex flex-col gap-1">
        {links.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              pathname === href
                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
