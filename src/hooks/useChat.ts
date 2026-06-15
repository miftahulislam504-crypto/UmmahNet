"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  subscribeToConversations,
  subscribeToMessages,
  subscribeToPresence,
  sendMessage,
  markAsSeen,
  getOrCreateConversation,
  initPresence,
} from "@/services/chatService";
import { useAuthStore }  from "@/store/authStore";
import type { Conversation, Message, UserPresence } from "@/types";

// ─── Conversation list ────────────────────────────────────────────────────────
export function useConversations() {
  const { user }    = useAuthStore();
  const [convs, setConvs]     = useState<(Conversation & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToConversations(user.uid, (data) => {
      setConvs(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Phase 5: total unread across all conversations
  const totalUnread = convs.reduce((sum, c) => {
    const count = (c.unreadCounts ?? {})[user?.uid ?? ""] ?? 0;
    return sum + count;
  }, 0);

  return { convs, loading, totalUnread };
}

// ─── Single conversation messages ─────────────────────────────────────────────
export function useMessages(conversationId: string) {
  const { user }                    = useAuthStore();
  const [messages, setMessages]     = useState<(Message & { id: string })[]>([]);
  const [loading,  setLoading]      = useState(true);
  const [sending,  setSending]      = useState(false);
  const bottomRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;
    const unsub = subscribeToMessages(conversationId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
    return () => unsub();
  }, [conversationId]);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 200);
    return () => clearTimeout(timer);
  }, [messages.length]);

  // Mark as seen when messages arrive and window is visible
  useEffect(() => {
    if (!user || !conversationId || messages.length === 0) return;
    markAsSeen(conversationId, user.uid);
  }, [messages, conversationId, user]);

  const send = useCallback(async (text: string, imageFile?: File) => {
    if (!user || (!text.trim() && !imageFile)) return;
    setSending(true);
    try {
      await sendMessage(conversationId, user.uid, text, imageFile);
    } finally {
      setSending(false);
    }
  }, [conversationId, user]);

  return { messages, loading, send, sending, bottomRef };
}

// ─── Start/open a conversation ────────────────────────────────────────────────
export function useStartConversation() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const start = useCallback(async (theirUid: string): Promise<string | null> => {
    if (!user) return null;
    setLoading(true);
    try {
      return await getOrCreateConversation(user.uid, theirUid);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { start, loading };
}

// ─── Phase 5: Presence for the current user ───────────────────────────────────
export function useMyPresence() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    const cleanup = initPresence(user.uid);
    return cleanup;
  }, [user]);
}

// ─── Phase 5: Watch another user's presence ──────────────────────────────────
export function useUserPresence(uid: string | undefined) {
  const [presence, setPresence] = useState<UserPresence>({ online: false, lastSeen: null });

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToPresence(uid, setPresence);
    return () => unsub();
  }, [uid]);

  return presence;
}
