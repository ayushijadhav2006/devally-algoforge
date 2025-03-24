import { NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  increment,
} from "firebase/firestore";
import {
  sendNotificationToUser,
  sendNotificationToRole,
  sendNotificationToNGO,
  sendNotificationToAll,
} from "@/lib/notificationService";
import { NOTIFICATION_TYPES } from "@/lib/notificationTypes";

/**
 * API endpoint to add notifications
 * Supports:
 * - Adding a notification to a single user by userId
 * - Adding notifications to multiple users by role (ngo, user, admin, etc.)
 * - Adding notifications to all users
 */
export async function POST(req) {
  try {
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || userDoc.data().role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, userRole, ngoId, type, customData, allUsers } =
      await req.json();

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: "Notification type is required" },
        { status: 400 }
      );
    }

    // Ensure at least one target is specified
    if (!userId && !userRole && !ngoId && !allUsers) {
      return NextResponse.json(
        {
          error:
            "At least one target (userId, userRole, ngoId, or allUsers) is required",
        },
        { status: 400 }
      );
    }

    // Strategy 1: Send to specific user
    if (userId) {
      await sendNotificationToUser(userId, type, customData);
    }

    // Strategy 2: Send to users by role
    if (userRole) {
      await sendNotificationToRole(userRole, type, customData);
    }

    // Strategy 3: Send to NGO members
    if (ngoId) {
      await sendNotificationToNGO(ngoId, type, customData);
    }

    // Strategy 4: Send to all users
    if (allUsers) {
      await sendNotificationToAll(type, customData);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}

// Endpoint to mark notifications as read
export async function PUT(req) {
  try {
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationIndex, markAllRead } = await req.json();

    const userNotificationsRef = doc(db, "notifications", user.uid);
    const userNotificationsDoc = await getDoc(userNotificationsRef);

    if (!userNotificationsDoc.exists()) {
      return NextResponse.json(
        { error: "No notifications found" },
        { status: 404 }
      );
    }

    const notifications = userNotificationsDoc.data().notifications || [];
    const unreadCount = userNotificationsDoc.data().unreadCount || 0;

    if (markAllRead) {
      // Mark all notifications as read
      const updatedNotifications = notifications.map((notification) => ({
        ...notification,
        read: true,
      }));

      await updateDoc(userNotificationsRef, {
        notifications: updatedNotifications,
        unreadCount: 0,
      });
    } else if (notificationIndex !== undefined && notificationIndex >= 0) {
      // Mark specific notification as read
      if (!notifications[notificationIndex]) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }

      notifications[notificationIndex].read = true;
      await updateDoc(userNotificationsRef, {
        notifications: notifications,
        unreadCount: Math.max(0, unreadCount - 1),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
