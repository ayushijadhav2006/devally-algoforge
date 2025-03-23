"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, X, Check, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPopup({
  notifications = [],
  onMarkAsRead,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // all, unread
  const popupRef = useRef(null);
  const router = useRouter();
  const { toast } = useToast();

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true;
    return activeTab === "unread" && !notification.read;
  });

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  // Handle marking a notification as read
  const handleMarkAsRead = async (index) => {
    try {
      if (!auth.currentUser) return;

      // Only proceed if the notification is not already marked as read
      if (notifications[index]?.read === false) {
        const userId = auth.currentUser.uid;
        const notificationsRef = doc(db, "notifications", userId);

        // Get current notifications to update the specific one
        const notificationsDoc = await getDoc(notificationsRef);

        if (notificationsDoc.exists()) {
          const allNotifications = notificationsDoc.data().notifications || [];
          if (allNotifications[index]) {
            allNotifications[index].read = true;

            // Update the document
            await updateDoc(notificationsRef, {
              notifications: allNotifications,
              unreadCount: Math.max(
                0,
                (notificationsDoc.data().unreadCount || 0) - 1
              ),
            });

            // Call the parent component's handler if provided
            if (typeof onMarkAsRead === "function") {
              onMarkAsRead(index);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      if (!auth.currentUser) return;

      const userId = auth.currentUser.uid;
      const notificationsRef = doc(db, "notifications", userId);

      // Update all notifications to read status
      const updatedNotifications = notifications.map((notification) => ({
        ...notification,
        read: true,
      }));

      await updateDoc(notificationsRef, {
        notifications: updatedNotifications,
        unreadCount: 0,
      });

      // Call the parent component's handler if provided
      if (typeof onMarkAsRead === "function") {
        onMarkAsRead(null, true); // Pass true to indicate marking all as read
      }

      toast({
        title: "Success",
        description: "All notifications marked as read",
        variant: "default",
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  // Handle notification click (navigate if has link and mark as read)
  const handleNotificationClick = (notification, index) => {
    handleMarkAsRead(index);

    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  return (
    <div ref={popupRef} className="relative">
      {/* Bell icon with unread indicator */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent/50 transition-colors"
      >
        <Bell size={18} className={unreadCount > 0 ? "text-emerald-500" : ""} />
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Notifications popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 right-0 mb-2 max-h-[400px] w-full md:w-80 overflow-hidden rounded-md border border-border bg-background shadow-lg z-50"
          >
            <div className="flex items-center justify-between border-b border-border p-3">
              <h3 className="font-medium">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 hover:bg-accent/50"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("all")}
                className={cn(
                  "flex-1 p-2 text-sm font-medium",
                  activeTab === "all"
                    ? "border-b-2 border-emerald-500 text-foreground"
                    : "text-muted-foreground"
                )}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={cn(
                  "flex-1 p-2 text-sm font-medium",
                  activeTab === "unread"
                    ? "border-b-2 border-emerald-500 text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
              \]
            </div>

            {/* Notifications list */}
            <div className="max-h-[250px] overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
                  <Bell size={24} className="mb-2 opacity-30" />
                  <p className="text-sm">
                    No notifications {activeTab === "unread" ? "unread" : ""}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredNotifications.map((notification, index) => {
                    const actualIndex = notifications.findIndex(
                      (n) =>
                        n.title === notification.title &&
                        n.message === notification.message &&
                        n.timestamp?.toDate?.().getTime() ===
                          notification.timestamp?.toDate?.().getTime()
                    );

                    return (
                      <li
                        key={`${notification.title}-${actualIndex}`}
                        className={cn(
                          "relative p-3 text-sm transition-colors cursor-pointer",
                          !notification.read
                            ? "bg-accent/20 hover:bg-accent/30"
                            : "hover:bg-accent/10",
                          notification.type === "warning" &&
                            "border-l-4 border-yellow-500",
                          notification.type === "error" &&
                            "border-l-4 border-red-500",
                          notification.type === "success" &&
                            "border-l-4 border-green-500"
                        )}
                        onClick={() =>
                          handleNotificationClick(notification, actualIndex)
                        }
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <h4 className="font-medium">{notification.title}</h4>
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(actualIndex);
                              }}
                              className="rounded-full p-1 text-xs hover:bg-background"
                              title="Mark as read"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                          <span>
                            {notification.timestamp?.toDate
                              ? format(
                                  notification.timestamp.toDate(),
                                  "MMM d, yyyy • h:mm a"
                                )
                              : "Just now"}
                          </span>
                          {notification.read && (
                            <span className="text-[10px] text-muted-foreground">
                              Read
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Actions */}
            {filteredNotifications.length > 0 && (
              <div className="border-t border-border p-2">
                <button
                  onClick={handleMarkAllAsRead}
                  className="w-full rounded-md bg-accent/50 p-2 text-xs font-medium hover:bg-accent transition-colors"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
