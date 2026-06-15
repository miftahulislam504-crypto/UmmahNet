"use client";

import { useEffect, useState } from "react";
import { Search, MessageCircle, Loader2 } from "lucide-react";
import { Avatar }    from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/authStore";
import { getOtherParticipant } from "@/services/chatService";
import { formatDate, cn } from "@/lib/utils";
import type { Conversation, UserProfile } from "@/types";

interface Props {
  convs:    (Conversation & { id: string })[];
  loading:  boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
}

interface ConvWithProfile extends Conversation {
  id:      string;
  other:   (UserProfile & { uid: string }) | null;
}

export function ConversationList({ convs, loading, activeId, onSelect }: Props) {
  const { user }                  = useAuthStore();
  const [enriched, setEnriched]   = useState<ConvWithProfile[]>([]);
  const [search,   setSearch]     = useState("");

  useEffect(() => {
    if (!user || convs.length === 0) { setEnriched([]); return; }
    Promise.all(
      convs.map(async (c) => {
        const other = await getOtherParticipant(c.participants, user.uid);
        return { ...c, other: other as (UserProfile & { uid: string }) | null };
      })
    ).then(setEnriched);
  }, [convs, user]);

  const filtered = enriched.filter((c) =>
    !search || c.other?.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-3">বার্তা</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="খুঁজুন..."
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-3 py-2
                       text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageCircle className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">কোনো কথোপকথন নেই</p>
          </div>
        )}

        {filtered.map((conv) => {
          const other     = conv.other;
          const updatedAt = (conv.updatedAt as any)?.toDate?.() ?? new Date();
          const isActive  = conv.id === activeId;
          // Phase 5: unread count for current user
          const unread    = (conv.unreadCounts ?? {})[user?.uid ?? ""] ?? 0;

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left",
                isActive
                  ? "bg-primary-50 dark:bg-primary-900/20"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
              )}
            >
              <div className="relative flex-shrink-0">
                <Avatar
                  src={other?.photoURL}
                  name={other?.displayName ?? "?"}
                  size="md"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "text-sm truncate",
                    unread > 0
                      ? "font-bold text-gray-900 dark:text-white"
                      : "font-semibold text-gray-900 dark:text-white"
                  )}>
                    {other?.displayName ?? "Unknown"}
                  </p>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDate(updatedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className={cn(
                    "text-xs truncate",
                    unread > 0 ? "font-medium text-gray-700 dark:text-gray-300" : "text-gray-500"
                  )}>
                    {conv.lastSenderId === user?.uid ? "আপনি: " : ""}
                    {conv.lastMessage || "কথোপকথন শুরু করুন"}
                  </p>
                  {/* Phase 5: unread badge */}
                  {unread > 0 && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 bg-primary-600 text-white
                                     text-[10px] font-bold rounded-full flex items-center
                                     justify-center px-1">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
