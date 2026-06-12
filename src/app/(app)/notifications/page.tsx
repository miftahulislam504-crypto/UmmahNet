"use client";

import { Bell, CheckCheck, Heart, MessageCircle, UserPlus, Loader2 } from "lucide-react";
import Link from "next/link";
import { Avatar }   from "@/components/ui/Avatar";
import { Button }   from "@/components/ui/Button";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDate, cn }   from "@/lib/utils";
import type { Notification } from "@/types";

const typeConfig: Record<
  Notification["type"],
  { icon: typeof Bell; color: string; label: string }
> = {
  friend_request: { icon: UserPlus,       color: "bg-primary-500", label: "বন্ধু অনুরোধ" },
  post_like:      { icon: Heart,          color: "bg-red-500",     label: "লাইক করেছেন" },
  post_comment:   { icon: MessageCircle,  color: "bg-green-500",   label: "মন্তব্য করেছেন" },
  message:        { icon: MessageCircle,  color: "bg-blue-500",    label: "মেসেজ" },
};

export default function NotificationsPage() {
  const { notifs, loading, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div className="flex flex-col gap-4">
      {/* Header card */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">নোটিফিকেশন</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">{unreadCount}টি অপঠিত</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4" />
              সব পড়া হিসেবে চিহ্নিত করুন
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      )}

      {/* Empty */}
      {!loading && notifs.length === 0 && (
        <div className="card p-14 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">কোনো নোটিফিকেশন নেই</h3>
          <p className="text-sm text-gray-500">নতুন নোটিফিকেশন এখানে দেখাবে</p>
        </div>
      )}

      {/* Notification list */}
      {!loading && notifs.length > 0 && (
        <div className="card overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {notifs.map((notif) => {
            const cfg       = typeConfig[notif.type];
            const Icon      = cfg.icon;
            const createdAt = (notif.createdAt as any)?.toDate?.() ?? new Date();

            const href =
              notif.type === "friend_request" ? `/profile/${notif.actorId}` :
              notif.type === "message"        ? `/messages?with=${notif.actorId}` :
              notif.referenceId               ? `/post/${notif.referenceId}` : "#";

            return (
              <Link
                key={notif.id}
                href={href}
                onClick={() => !notif.read && markRead(notif.id)}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors",
                  "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                  !notif.read && "bg-primary-50/50 dark:bg-primary-900/10"
                )}
              >
                {/* Avatar + icon badge */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                      {notif.actorName?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <span className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center",
                    cfg.color
                  )}>
                    <Icon className="w-2.5 h-2.5 text-white" />
                  </span>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-semibold">{notif.actorName}</span>
                    {" "}
                    <span className="text-gray-600 dark:text-gray-400">{cfg.label}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(createdAt)}</p>
                </div>

                {/* Unread dot */}
                {!notif.read && (
                  <div className="w-2.5 h-2.5 bg-primary-600 rounded-full flex-shrink-0 mt-1.5" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
