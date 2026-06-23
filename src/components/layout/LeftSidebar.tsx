"use client";

import Link                          from "next/link";
import { usePathname }               from "next/navigation";
import {
  Home, Users, MessageCircle, Bell,
  Bookmark, Settings, ChevronRight,
} from "lucide-react";
import { Avatar }       from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/authStore";
import { cn }           from "@/lib/utils";

const LINKS = [
  { href: "/",              icon: Home,          label: "হোম" },
  { href: "/friends",       icon: Users,         label: "বন্ধু" },
  { href: "/messages",      icon: MessageCircle, label: "বার্তা" },
  { href: "/notifications", icon: Bell,          label: "নোটিফিকেশন" },
  { href: "/saved",         icon: Bookmark,      label: "সেভ করা" },
  { href: "/settings",      icon: Settings,      label: "সেটিংস" },
];

export function LeftSidebar() {
  const { profile, user } = useAuthStore();
  const pathname          = usePathname();

  return (
    <aside className="hidden lg:flex flex-col gap-2 w-60 sticky top-[72px] h-[calc(100vh-5rem)] overflow-y-auto pb-6">

      {/* Profile mini card */}
      {profile && user && (
        <Link
          href={`/profile/${user.uid}`}
          className="card flex items-center gap-3 px-3.5 py-3 hover:border-primary-600/30 group"
        >
          <div className="relative">
            <Avatar src={profile.photoURL} name={profile.displayName} size="md" />
            {/* Online dot */}
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-midnight"
              style={{ background: "#10b981" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-100 truncate">
              {profile.displayName}
            </p>
            <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-primary-400 transition-colors" />
        </Link>
      )}

      {/* Nav links */}
      <nav className="card flex flex-col gap-0.5 p-2">
        {LINKS.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "text-primary-300"
                  : "text-gray-400 hover:text-gray-200"
              )}
              style={
                isActive
                  ? { background: "rgba(124,58,237,0.18)" }
                  : undefined
              }
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              <Icon
                className={cn(
                  "w-[18px] h-[18px] flex-shrink-0 transition-colors",
                  isActive ? "text-primary-400" : "text-gray-500 group-hover:text-gray-300"
                )}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* UmmahNet label at bottom */}
      <div className="mt-auto px-3 py-2">
        <p className="text-xs text-gray-600 text-center">
          © 2025 UmmahNet
        </p>
      </div>
    </aside>
  );
}
