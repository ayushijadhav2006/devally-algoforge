import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  query,
  where,
  getDocs,
  writeBatch,
  collection,
} from "firebase/firestore";
import { getNotificationConfig } from "./notificationTypes";

/**
 * Send a notification to a specific user
 * @param {string} userId - The ID of the user to send the notification to
 * @param {string} type - The type of notification (from NOTIFICATION_TYPES)
 * @param {Object} customData - Optional custom data to override default notification config
 * @returns {Promise<boolean>}
 */
export const sendNotificationToUser = async (userId, type, customData = {}) => {
  try {
    const config = getNotificationConfig(type);
    const notification = {
      ...config,
      ...customData,
      read: false,
      timestamp: new Date(),
      senderId: auth.currentUser?.uid || "system",
    };

    const userNotificationsRef = doc(db, "notifications", userId);
    const userNotificationsDoc = await getDoc(userNotificationsRef);

    if (userNotificationsDoc.exists()) {
      // Update existing notifications document
      await updateDoc(userNotificationsRef, {
        notifications: arrayUnion(notification),
        unreadCount: (userNotificationsDoc.data().unreadCount || 0) + 1,
      });
    } else {
      // Create new notifications document
      await setDoc(userNotificationsRef, {
        notifications: [notification],
        unreadCount: 1,
      });
    }

    return true;
  } catch (error) {
    console.error("Error sending notification to user:", error);
    return false;
  }
};

/**
 * Send a notification to all users with a specific role
 * @param {string} role - The role of users to send the notification to
 * @param {string} type - The type of notification (from NOTIFICATION_TYPES)
 * @param {Object} customData - Optional custom data to override default notification config
 * @returns {Promise<boolean>}
 */
export const sendNotificationToRole = async (role, type, customData = {}) => {
  try {
    const config = getNotificationConfig(type);
    const notification = {
      ...config,
      ...customData,
      read: false,
      timestamp: new Date(),
      senderId: auth.currentUser?.uid || "system",
    };

    // Get all users with the specified role
    const usersQuery = query(
      collection(db, "users"),
      where("role", "==", role)
    );
    const usersSnapshot = await getDocs(usersQuery);

    // Use batch write for better performance
    const batch = writeBatch(db);
    let count = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userNotificationsRef = doc(db, "notifications", userId);
      const userNotificationsDoc = await getDoc(userNotificationsRef);

      if (userNotificationsDoc.exists()) {
        batch.update(userNotificationsRef, {
          notifications: arrayUnion(notification),
          unreadCount: (userNotificationsDoc.data().unreadCount || 0) + 1,
        });
      } else {
        batch.set(userNotificationsRef, {
          notifications: [notification],
          unreadCount: 1,
        });
      }

      count++;
      if (count === 500) {
        await batch.commit();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    return true;
  } catch (error) {
    console.error("Error sending notification to role:", error);
    return false;
  }
};

/**
 * Send a notification to all members of an NGO
 * @param {string} ngoId - The ID of the NGO
 * @param {string} type - The type of notification (from NOTIFICATION_TYPES)
 * @param {Object} customData - Optional custom data to override default notification config
 * @returns {Promise<boolean>}
 */
export const sendNotificationToNGO = async (ngoId, type, customData = {}) => {
  try {
    const config = getNotificationConfig(type);
    const notification = {
      ...config,
      ...customData,
      read: false,
      timestamp: new Date(),
      senderId: auth.currentUser?.uid || "system",
    };

    // Get NGO members
    const ngoDoc = await getDoc(doc(db, "ngo", ngoId));
    if (!ngoDoc.exists()) {
      throw new Error("NGO not found");
    }

    const ngoData = ngoDoc.data();
    const members = ngoData.members || [];
    const ownerId = ngoData.ownerId;

    // Use batch write for better performance
    const batch = writeBatch(db);
    let count = 0;

    // Send to NGO owner
    if (ownerId) {
      const ownerNotificationsRef = doc(db, "notifications", ownerId);
      const ownerNotificationsDoc = await getDoc(ownerNotificationsRef);

      if (ownerNotificationsDoc.exists()) {
        batch.update(ownerNotificationsRef, {
          notifications: arrayUnion(notification),
          unreadCount: (ownerNotificationsDoc.data().unreadCount || 0) + 1,
        });
      } else {
        batch.set(ownerNotificationsRef, {
          notifications: [notification],
          unreadCount: 1,
        });
      }
      count++;
    }

    // Send to NGO members
    for (const memberId of members) {
      const memberNotificationsRef = doc(db, "notifications", memberId);
      const memberNotificationsDoc = await getDoc(memberNotificationsRef);

      if (memberNotificationsDoc.exists()) {
        batch.update(memberNotificationsRef, {
          notifications: arrayUnion(notification),
          unreadCount: (memberNotificationsDoc.data().unreadCount || 0) + 1,
        });
      } else {
        batch.set(memberNotificationsRef, {
          notifications: [notification],
          unreadCount: 1,
        });
      }

      count++;
      if (count === 500) {
        await batch.commit();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    return true;
  } catch (error) {
    console.error("Error sending notification to NGO:", error);
    return false;
  }
};

/**
 * Send a notification to all users in the system
 * @param {string} type - The type of notification (from NOTIFICATION_TYPES)
 * @param {Object} customData - Optional custom data to override default notification config
 * @returns {Promise<boolean>}
 */
export const sendNotificationToAll = async (type, customData = {}) => {
  try {
    const config = getNotificationConfig(type);
    const notification = {
      ...config,
      ...customData,
      read: false,
      timestamp: new Date(),
      senderId: auth.currentUser?.uid || "system",
    };

    // Get all users
    const usersSnapshot = await getDocs(collection(db, "users"));

    // Use batch write for better performance
    const batch = writeBatch(db);
    let count = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userNotificationsRef = doc(db, "notifications", userId);
      const userNotificationsDoc = await getDoc(userNotificationsRef);

      if (userNotificationsDoc.exists()) {
        batch.update(userNotificationsRef, {
          notifications: arrayUnion(notification),
          unreadCount: (userNotificationsDoc.data().unreadCount || 0) + 1,
        });
      } else {
        batch.set(userNotificationsRef, {
          notifications: [notification],
          unreadCount: 1,
        });
      }

      count++;
      if (count === 500) {
        await batch.commit();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    return true;
  } catch (error) {
    console.error("Error sending notification to all users:", error);
    return false;
  }
};
