"use client";

import { useState, useEffect } from "react";
import { useSearchParams }     from "next/navigation";
import { MessageCircle }       from "lucide-react";
import { ConversationList }    from "@/components/chat/ConversationList";
import { ChatWindow }          from "@/components/chat/ChatWindow";
import { useConversations }    from "@/hooks/useChat";
import { getOrCreateConversation } from "@/services/chatService";
import { useAuthStore }        from "@/store/authStore";

export default function MessagesPage() {
  const { user }                        = useAuthStore();
  const { convs, loading }              = useConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const searchParams                    = useSearchParams();

  // Auto-open conversation if ?with=uid in URL (from profile page)
  useEffect(() => {
    const withUid = searchParams.get("with");
    if (!withUid || !user) return;
    getOrCreateConversation(user.uid, withUid).then(setActiveConvId);
  }, [searchParams, user]);

  return (
    <div className="card overflow-hidden" style={{ height: "calc(100vh - 6rem)" }}>
      <div className="flex h-full">
        {/* Conversation list — hidden on mobile when chat open */}
        <div className={`
          ${activeConvId ? "hidden md:flex" : "flex"}
          flex-col w-full md:w-80 border-r border-gray-100 dark:border-gray-800 flex-shrink-0
        `}>
          <ConversationList
            convs={convs}
            loading={loading}
            activeId={activeConvId}
            onSelect={setActiveConvId}
          />
        </div>

        {/* Chat window */}
        <div className={`
          ${activeConvId ? "flex" : "hidden md:flex"}
          flex-1 flex-col min-w-0
        `}>
          {activeConvId ? (
            <ChatWindow
              conversationId={activeConvId}
              onBack={() => setActiveConvId(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/20 rounded-full
                              flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                মেসেজ শুরু করুন
              </h3>
              <p className="text-sm text-gray-500">
                বাম দিক থেকে কথোপকথন বেছে নিন
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
