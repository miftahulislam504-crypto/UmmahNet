"use client";

import { useState, useEffect } from "react";
import {
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/notificationService";
import { useAuthStore } from "@/store/authStore";
import type { Notification } from "@/types";

export function useNotifications() {
  const { user }                          = useAuthStore();
  const [notifs,   setNotifs]             = useState<(Notification & { id: string })[]>([]);
  const [loading,  setLoading]            = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, (data) => {
      setNotifs(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    await markNotificationRead(id);
  };

  const markAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.uid);
  };

  return { notifs, loading, unreadCount, markRead, markAllRead };
}
