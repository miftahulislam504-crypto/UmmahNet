"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Plus, MessageCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50
                    bg-white dark:bg-gray-900
                    border-t border-gray-100 dark:border-gray-800
                    safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">

        <NavTab href="/"         icon={Home}          label="Home"     active={pathname === "/"} />
        <NavTab href="/friends"  icon={Users}         label="Friends"  active={pathname === "/friends"} />

        {/* Center + button → /create-post */}
        <Link
          href="/create-post"
          aria-label="Create post"
          className="flex items-center justify-center
                     w-12 h-12 rounded-2xl -mt-5
                     bg-primary-600 hover:bg-primary-700
                     text-white shadow-lg shadow-primary-600/40
                     transition-all duration-200 active:scale-95 flex-shrink-0"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </Link>

        <NavTab href="/messages" icon={MessageCircle} label="Messages" active={pathname === "/messages"} />
        <NavTab href="/settings" icon={Settings}      label="Settings" active={pathname === "/settings"} />
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
