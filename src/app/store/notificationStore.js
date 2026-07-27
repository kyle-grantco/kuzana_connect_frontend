"use client";
import { create } from "zustand";

/*
  Notification store — replaces NotificationContext.

  Usage anywhere (no provider needed):
    import { useNotificationStore } from "@/app/store/notificationStore";
    const { notify } = useNotificationStore();
    notify("Logged in", "success");
    notify("Session expired", "error", 6000);
    notify("Processing...", "info", 0); // persists until dismissed

  Types: "success" | "error" | "warning" | "info"
  Duration: ms (default 4000). Pass 0 to persist until manually dismissed.
*/

let timerMap = {};

export const useNotificationStore = create((set, get) => ({
  notifications: [],

  notify: (message, type = "info", duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));

    if (duration > 0) {
      timerMap[id] = setTimeout(() => get().dismiss(id), duration);
    }

    return id;
  },

  dismiss: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
    if (timerMap[id]) {
      clearTimeout(timerMap[id]);
      delete timerMap[id];
    }
  },

  dismissAll: () => {
    Object.values(timerMap).forEach(clearTimeout);
    timerMap = {};
    set({ notifications: [] });
  },
}));
