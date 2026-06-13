"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, ImageIcon, Loader2, X } from "lucide-react";
import Image from "next/image";
import Link  from "next/link";
import { Avatar }      from "@/components/ui/Avatar";
import { useMessages } from "@/hooks/useChat";
import { useAuthStore } from "@/store/authStore";
import { getOtherParticipant } from "@/services/chatService";
import { formatDate, cn } from "@/lib/utils";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { UserProfile } from "@/types";

interface Props {
  conversationId: string;
  onBack:         () => void;
}

export function ChatWindow({ conversationId, onBack }: Props) {
  const { user }                    = useAuthStore();
  const { messages, loading, send, sending, bottomRef } = useMessages(conversationId);
  const [text,     setText]         = useState("");
  const [imgFile,  setImgFile]      = useState<File | null>(null);
  const [preview,  setPreview]      = useState<string | null>(null);
  const [other,    setOther]        = useState<UserProfile | null>(null);
  const fileRef                     = useRef<HTMLInputElement>(null);

  // Load other participant info
  useEffect(() => {
    const convDoc = doc(db, "conversations", conversationId);
    getDoc(convDoc).then(async (snap) => {
      if (!snap.exists() || !user) return;
      const participants = snap.data().participants as string[];
      const otherId = participants.find((id) => id !== user.uid);
      if (!otherId) return;
      const uSnap = await getDoc(doc(db, "users", otherId));
      if (uSnap.exists()) setOther(uSnap.data() as UserProfile);
    });
  }, [conversationId, user]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImgFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSend() {
    if (!text.trim() && !imgFile) return;
    await send(text, imgFile ?? undefined);
    setText("");
    setImgFile(null);
    setPreview(null);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {other && (
          <>
            <Link href={`/profile/${other.uid}`}>
              <Avatar src={other.photoURL} name={other.displayName} size="sm" />
            </Link>
            <div>
              <Link href={`/profile/${other.uid}`}>
                <p className="font-semibold text-sm text-gray-900 dark:text-white hover:underline">
                  {other.displayName}
                </p>
              </Link>
              <p className="text-xs text-gray-500">@{other.username}</p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe      = msg.senderId === user?.uid;
          const createdAt = (msg.createdAt as any)?.toDate?.() ?? new Date();
          const prevMsg   = messages[i - 1];
          const showTime  = !prevMsg ||
            (createdAt.getTime() - ((prevMsg.createdAt as any)?.toDate?.() ?? new Date()).getTime()) > 5 * 60 * 1000;

          return (
            <div key={msg.id}>
              {showTime && (
                <p className="text-xs text-gray-400 text-center my-2">
                  {formatDate(createdAt)}
                </p>
              )}
              <div className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                {!isMe && other && (
                  <Avatar src={other.photoURL} name={other.displayName} size="sm" />
                )}
                <div className={cn(
                  "max-w-[70%] rounded-2xl px-3 py-2 text-sm",
                  isMe
                    ? "bg-primary-600 text-white rounded-br-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                )}>
                  {msg.mediaUrl && (
                    <div className="relative w-48 h-48 rounded-xl overflow-hidden mb-1">
                      <Image src={msg.mediaUrl} alt="" fill className="object-cover" />
                    </div>
                  )}
                  {msg.text && <p className="break-words leading-relaxed">{msg.text}</p>}
                  <p className={cn(
                    "text-xs mt-1",
                    isMe ? "text-primary-200" : "text-gray-400"
                  )}>
                    {createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    {isMe && msg.seen && " ·  · Seen"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      {preview && (
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="relative inline-block">
            <Image src={preview} alt="" width={80} height={80} className="rounded-xl object-cover" />
            <button
              onClick={() => { setImgFile(null); setPreview(null); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white
                         rounded-full flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
        <button
          onClick={() => fileRef.current?.click()}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Write a message..."
          className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2.5
                     text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all"
        />

        <button
          onClick={handleSend}
          disabled={(!text.trim() && !imgFile) || sending}
          className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center
                     justify-center flex-shrink-0 hover:bg-primary-700 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
