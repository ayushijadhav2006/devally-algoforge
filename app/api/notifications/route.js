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

/**
 * API endpoint to add notifications
 * Supports:
 * - Adding a notification to a single user by userId
 * - Adding notifications to multiple users by role (ngo, user, admin, etc.)
 * - Adding notifications to all users
 */
export async function POST(request) {
  try {
    const { authorization } = request.headers;

    // Verify authentication - require auth token for security
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing or invalid token" },
        { status: 401 }
      );
    }

    const idToken = authorization.split("Bearer ")[1];

    // Verify the token using Firebase Client SDK
    const userCredential = await auth.signInWithCustomToken(idToken);
    const adminUid = userCredential.user.uid;

    // Verify admin rights
    const adminRef = doc(db, "users", adminUid);
    const adminDoc = await getDoc(adminRef);

    if (
      !adminDoc.exists() ||
      (adminDoc.data().role !== "admin" && !adminDoc.data().isSystemAdmin)
    ) {
      return NextResponse.json(
        { error: "Forbidden - Requires admin privileges" },
        { status: 403 }
      );
    }

    // Get the notification data from the request body
    const requestData = await request.json();
    const {
      userId, // Optional: specific user ID
      userRole, // Optional: target user role (ngo, user, admin)
      ngoId, // Optional: for notifications to specific NGO members
      title, // Required: notification title
      message, // Required: notification message
      type = "info", // Optional: notification type (info, warning, success, error)
      link = null, // Optional: link to navigate when notification is clicked
      allUsers = false, // Optional: send to all users
    } = requestData;

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: title and message are required" },
        { status: 400 }
      );
    }

    // Require at least one target (userId, userRole, ngoId, or allUsers)
    if (!userId && !userRole && !ngoId && !allUsers) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: specify at least one target (userId, userRole, ngoId, or allUsers)",
        },
        { status: 400 }
      );
    }

    // Create the notification object
    const notification = {
      title,
      message,
      type,
      link,
      read: false,
      timestamp: new Date(),
      senderId: adminUid,
    };

    // Strategy 1: Send to a specific user
    if (userId) {
      // Check if the user exists
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return NextResponse.json(
          { error: `User with ID ${userId} not found` },
          { status: 404 }
        );
      }

      // Check if the user has a notifications document
      const notificationsRef = doc(db, "notifications", userId);
      const notificationsDoc = await getDoc(notificationsRef);

      if (!notificationsDoc.exists()) {
        // Create a new notifications document
        await updateDoc(notificationsRef, {
          notifications: [notification],
          unreadCount: 1,
        });
      } else {
        // Update the existing notifications document
        await updateDoc(notificationsRef, {
          notifications: arrayUnion(notification),
          unreadCount: (notificationsDoc.data().unreadCount || 0) + 1,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Notification sent to user ${userId}`,
      });
    }

    // Strategy 2: Send to users by role
    if (userRole) {
      const usersQuery = query(
        collection(db, "users"),
        where("type", "==", userRole)
      );
      const usersSnapshot = await getDocs(usersQuery);

      if (usersSnapshot.empty) {
        return NextResponse.json(
          { error: `No users found with role ${userRole}` },
          { status: 404 }
        );
      }

      const batch = writeBatch(db);
      const userIds = [];

      usersSnapshot.forEach((userDoc) => {
        const userId = userDoc.id;
        userIds.push(userId);

        const notificationsRef = doc(db, "notifications", userId);
        batch.update(notificationsRef, {
          notifications: arrayUnion(notification),
          unreadCount: increment(1),
        });
      });

      await batch.commit();

      return NextResponse.json({
        success: true,
        message: `Notification sent to ${userIds.length} users with role ${userRole}`,
        users: userIds,
      });
    }

    // Strategy 3: Send to NGO members
    if (ngoId) {
      const membersQuery = query(
        collection(db, "users"),
        where("ngoId", "==", ngoId)
      );
      const membersSnapshot = await getDocs(membersQuery);

      if (membersSnapshot.empty) {
        return NextResponse.json(
          { error: `No members found for NGO ${ngoId}` },
          { status: 404 }
        );
      }

      const batch = writeBatch(db);
      const memberIds = [];

      membersSnapshot.forEach((memberDoc) => {
        const memberId = memberDoc.id;
        memberIds.push(memberId);

        const notificationsRef = doc(db, "notifications", memberId);
        batch.update(notificationsRef, {
          notifications: arrayUnion(notification),
          unreadCount: increment(1),
        });
      });

      // Also add to the NGO admin (owner)
      const ngoRef = doc(db, "ngo", ngoId);
      const ngoDoc = await getDoc(ngoRef);

      if (ngoDoc.exists()) {
        const ownerId = ngoDoc.data().ownerId;
        if (ownerId && !memberIds.includes(ownerId)) {
          memberIds.push(ownerId);
          const notificationsRef = doc(db, "notifications", ownerId);
          batch.update(notificationsRef, {
            notifications: arrayUnion(notification),
            unreadCount: increment(1),
          });
        }
      }

      await batch.commit();

      return NextResponse.json({
        success: true,
        message: `Notification sent to ${memberIds.length} members of NGO ${ngoId}`,
        members: memberIds,
      });
    }

    // Strategy 4: Send to all users
    if (allUsers) {
      const usersSnapshot = await getDocs(collection(db, "users"));

      if (usersSnapshot.empty) {
        return NextResponse.json(
          { error: "No users found in the system" },
          { status: 404 }
        );
      }

      const batch = writeBatch(db);
      const userIds = [];

      usersSnapshot.forEach((userDoc) => {
        const userId = userDoc.id;
        userIds.push(userId);

        const notificationsRef = doc(db, "notifications", userId);
        batch.update(notificationsRef, {
          notifications: arrayUnion(notification),
          unreadCount: increment(1),
        });
      });

      await batch.commit();

      return NextResponse.json({
        success: true,
        message: `Notification sent to all ${userIds.length} users`,
        userCount: userIds.length,
      });
    }

    return NextResponse.json(
      { error: "Invalid request parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in notifications API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// Endpoint to mark notifications as read
export async function PUT(request) {
  try {
    const { authorization } = request.headers;

    // Verify authentication
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing or invalid token" },
        { status: 401 }
      );
    }

    const idToken = authorization.split("Bearer ")[1];

    // Verify the token using Firebase Client SDK
    const userCredential = await auth.signInWithCustomToken(idToken);
    const uid = userCredential.user.uid;

    // Get request data
    const { notificationIds, markAllRead = false } = await request.json();

    const notificationsRef = doc(db, "notifications", uid);
    const notificationsDoc = await getDoc(notificationsRef);

    if (!notificationsDoc.exists()) {
      return NextResponse.json(
        { error: "No notifications found for this user" },
        { status: 404 }
      );
    }

    const notifications = notificationsDoc.data().notifications || [];
    let unreadCount = notificationsDoc.data().unreadCount || 0;

    if (markAllRead) {
      // Mark all as read
      const updatedNotifications = notifications.map((notification) => ({
        ...notification,
        read: true,
      }));

      await updateDoc(notificationsRef, {
        notifications: updatedNotifications,
        unreadCount: 0,
      });

      return NextResponse.json({
        success: true,
        message: `Marked all notifications as read`,
      });
    }

    if (
      !notificationIds ||
      !Array.isArray(notificationIds) ||
      notificationIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing notificationIds or invalid format" },
        { status: 400 }
      );
    }

    // Mark specific notifications as read
    const updatedNotifications = notifications.map((notification, index) => {
      if (notificationIds.includes(index) && !notification.read) {
        unreadCount = Math.max(0, unreadCount - 1);
        return { ...notification, read: true };
      }
      return notification;
    });

    await updateDoc(notificationsRef, {
      notifications: updatedNotifications,
      unreadCount,
    });

    return NextResponse.json({
      success: true,
      message: `Marked ${notificationIds.length} notifications as read`,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
