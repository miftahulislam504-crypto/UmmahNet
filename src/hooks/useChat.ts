"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage,
  markAsSeen,
  getOrCreateConversation,
} from "@/services/chatService";
import { useAuthStore }  from "@/store/authStore";
import type { Conversation, Message } from "@/types";
import type { UserProfile } from "@/types";

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

  return { convs, loading };
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

  // BUG 6 FIX: previously scrolled using a 50ms timeout.
  // On Vercel production, slow cold starts caused the scroll to be missed.
  // Fix: now scrolls via useEffect whenever messages change,
  // and the timeout is increased to 200ms so the DOM finishes rendering.
  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 200);
    return () => clearTimeout(timer);
  }, [messages.length]);

  // Mark as seen when messages arrive
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
