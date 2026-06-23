"use client";

import Link            from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, PlusCircle, MessageCircle, User } from "lucide-react";
import { useAuthStore }    from "@/store/authStore";
import { cn }              from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",          icon: Home,          label: "Home"     },
  { href: "/friends",   icon: Users,         label: "Friends"  },
  { href: "/create-post", icon: PlusCircle,  label: "Create",  isCreate: true },
  { href: "/messages",  icon: MessageCircle, label: "Messages" },
  { href: "/profile",   icon: User,          label: "Profile", isDynamic: true },
];

export function BottomNav() {
  const pathname         = usePathname();
  const { user, profile } = useAuthStore();

  return (
    /* floating dock */
    <nav
      className="fixed bottom-3 inset-x-3 z-50 safe-area-bottom md:hidden"
      aria-label="Bottom navigation"
    >
      <div
        className="flex items-center justify-around px-2 py-1 rounded-2xl"
        style={{
          background:         "rgba(15,13,26,0.88)",
          backdropFilter:     "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border:             "1px solid rgba(255,255,255,0.09)",
          boxShadow:          "0 -1px 0 rgba(255,255,255,0.05), 0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.08)",
        }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label, isCreate, isDynamic }) => {
          const resolvedHref = isDynamic && user ? `/profile/${user.uid}` : href;
          const isActive = isDynamic
            ? pathname.startsWith("/profile")
            : href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

          if (isCreate) {
            return (
              <Link
                key={href}
                href={resolvedHref}
                aria-label={label}
                className="relative flex flex-col items-center justify-center p-2 group"
              >
                {/* glowing plus button */}
                <span
                  className="flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-300 group-active:scale-90"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #9f67fa 100%)",
                    boxShadow:  "0 0 16px rgba(124,58,237,0.5), 0 4px 12px rgba(0,0,0,0.3)",
                  }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={resolvedHref}
              href={resolvedHref}
              aria-label={label}
              className="relative flex flex-col items-center justify-center p-2.5 group min-w-[44px]"
            >
              {/* Active pill indicator */}
              {isActive && (
                <span
                  className="absolute inset-0 rounded-xl"
                  style={{ background: "rgba(124,58,237,0.18)" }}
                />
              )}

              <Icon
                className={cn(
                  "relative w-[22px] h-[22px] transition-all duration-200",
                  isActive
                    ? "text-primary-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]"
                    : "text-gray-500 group-hover:text-gray-300 group-active:scale-90"
                )}
                strokeWidth={isActive ? 2.2 : 1.8}
              />

              {/* Active dot */}
              {isActive && (
                <span
                  className="absolute bottom-1.5 w-1 h-1 rounded-full"
                  style={{ background: "#9f67fa" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
