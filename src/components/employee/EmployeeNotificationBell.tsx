"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationItem } from "@/types";

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true });
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

export function EmployeeNotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/employee/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount((data.notifications || []).filter((n: any) => !n.is_read).length);
    } catch (err) {
      // noop
    }
  };

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 30000);
    return () => clearInterval(id);
  }, []);

  const unreadBadge = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 99 ? "99+" : `${unreadCount}`;
  }, [unreadCount]);

  const markAllAsRead = async () => {
    try {
      const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (ids.length === 0) return;
      const res = await fetch("/api/employee/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      toast.error("Failed to mark notifications as read");
    }
  };

  const openNotification = async (item: NotificationItem) => {
    try {
      if (!item.is_read) {
        await fetch(`/api/employee/notifications/${item.id}`, { method: "PATCH" });
        setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setOpen(false);
      if ((item as any).related_url) {
        window.location.href = (item as any).related_url;
      }
    } catch (err) {
      toast.error("Failed to open notification");
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative h-9 w-9 rounded-md flex items-center justify-center text-[#F5F5F0] hover:text-[#FFD700] hover:bg-[rgba(255,215,0,0.06)]">
        <Bell className="h-5 w-5" />
        {unreadBadge && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadBadge}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px] p-0 bg-[#1A1A1A] border border-[rgba(255,215,0,0.2)] text-[#F5F5F0]">
        <div className="px-4 py-3 border-b border-[rgba(255,215,0,0.15)] flex items-center justify-between">
          <p className="font-space text-sm font-semibold text-[#FFD700]">Notifications</p>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-[#F5F5F0]" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-5 text-sm text-[rgba(245,245,240,0.6)]">No notifications yet.</p>
          ) : (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-full text-left px-4 py-3 border-l-4 border-b border-[rgba(255,215,0,0.08)] ${item.is_read ? "bg-transparent" : "bg-[rgba(255,215,0,0.08)]"}`}
                onClick={() => openNotification(item)}
              >
                <p className="font-space text-sm text-[#F5F5F0]">{item.message}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-space text-xs text-[rgba(245,245,240,0.6)]">{formatTimestamp(item.created_at)}</span>
                  {!item.is_read && <Badge className="bg-[#FFD700] text-[#0A0A0A]">Unread</Badge>}
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
