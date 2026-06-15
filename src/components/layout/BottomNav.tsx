"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Plus, MessageCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations } from "@/hooks/useChat";

export function BottomNav() {
  const pathname = usePathname();
  // Phase 5: show total unread message count on messages tab
  const { totalUnread } = useConversations();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50
                    bg-white dark:bg-gray-900
                    border-t border-gray-100 dark:border-gray-800
                    safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">

        <NavTab href="/"        icon={Home}  label="হোম"    active={pathname === "/"} />
        <NavTab href="/friends" icon={Users} label="বন্ধু"   active={pathname === "/friends"} />

        {/* Center + button → /create-post */}
        <Link
          href="/create-post"
          aria-label="পোস্ট তৈরি করুন"
          className="flex items-center justify-center
                     w-12 h-12 rounded-2xl -mt-5
                     bg-primary-600 hover:bg-primary-700
                     text-white shadow-lg shadow-primary-600/40
                     transition-all duration-200 active:scale-95 flex-shrink-0"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </Link>

        {/* Messages tab with unread badge */}
        <div className="relative">
          <NavTab
            href="/messages"
            icon={MessageCircle}
            label="বার্তা"
            active={pathname === "/messages"}
          />
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 right-1 min-w-[16px] h-4 bg-red-500 text-white
                             text-[9px] font-bold rounded-full flex items-center justify-center
                             px-1 pointer-events-none">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </div>

        <NavTab href="/settings" icon={Settings} label="সেটিংস" active={pathname === "/settings"} />
      </div>
    </nav>
  );
}

function NavTab({ href, icon: Icon, label, active }: {
  href: string; icon: React.ElementType; label: string; active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-0.5 w-14 h-full transition-colors"
      aria-label={label}
    >
      <Icon className={cn(
        "w-6 h-6 transition-all duration-200",
        active ? "text-primary-600 stroke-[2.5]" : "text-gray-400 dark:text-gray-500 stroke-[1.8]"
      )} />
      <span className={cn(
        "text-[10px] font-medium tracking-wide transition-colors",
        active ? "text-primary-600" : "text-gray-400 dark:text-gray-500"
      )}>
        {label}
      </span>
    </Link>
  );
}
