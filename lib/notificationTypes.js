// Notification types and their configurations
export const NOTIFICATION_TYPES = {
  // User-related notifications
  USER_REGISTRATION: {
    title: "Welcome to DevAlly!",
    message:
      "Thank you for joining our community. Start making a difference today!",
    type: "success",
    link: "/dashboard/user",
  },
  PROFILE_UPDATE: {
    title: "Profile Updated",
    message: "Your profile has been successfully updated.",
    type: "info",
    link: "/dashboard/user/profile",
  },
  EMAIL_VERIFICATION: {
    title: "Email Verification",
    message: "Please verify your email address to access all features.",
    type: "warning",
    link: "/dashboard/user/profile",
  },
  TWO_FACTOR_ENABLED: {
    title: "2FA Enabled",
    message: "Two-factor authentication has been enabled for your account.",
    type: "success",
    link: "/dashboard/user/profile",
  },

  // Activity-related notifications
  ACTIVITY_REGISTRATION: {
    title: "Event Registration Successful",
    message: "You have successfully registered for the event.",
    type: "success",
    link: "/dashboard/user/activities",
  },
  ACTIVITY_REMINDER: {
    title: "Upcoming Event Reminder",
    message: "You have an upcoming event tomorrow. Don't forget to attend!",
    type: "info",
    link: "/dashboard/user/activities",
  },
  ACTIVITY_CANCELLED: {
    title: "Event Cancelled",
    message: "An event you registered for has been cancelled.",
    type: "warning",
    link: "/dashboard/user/activities",
  },
  ACTIVITY_COMPLETED: {
    title: "Event Completed",
    message:
      "Thank you for participating in the event. Your certificate is ready!",
    type: "success",
    link: "/dashboard/user/activities",
  },
  ATTENDANCE_MARKED: {
    title: "Attendance Marked",
    message: "Your attendance has been marked for the event.",
    type: "success",
    link: "/dashboard/user/activities",
  },
  CERTIFICATE_READY: {
    title: "Certificate Ready",
    message: "Your participation certificate is ready to download.",
    type: "success",
    link: "/dashboard/user/activities",
  },

  // Donation-related notifications
  DONATION_RECEIVED: {
    title: "Donation Received",
    message: "Thank you for your generous donation!",
    type: "success",
    link: "/dashboard/user/donations",
  },
  DONATION_PROCESSING: {
    title: "Donation Processing",
    message:
      "Your donation is being processed. We'll notify you once it's complete.",
    type: "info",
    link: "/dashboard/user/donations",
  },
  DONATION_COMPLETED: {
    title: "Donation Completed",
    message: "Your donation has been successfully processed.",
    type: "success",
    link: "/dashboard/user/donations",
  },
  DONATION_FAILED: {
    title: "Donation Failed",
    message: "There was an issue processing your donation. Please try again.",
    type: "error",
    link: "/dashboard/user/donations",
  },

  // NGO-related notifications
  NGO_JOIN_REQUEST: {
    title: "New Join Request",
    message: "A new user has requested to join your NGO.",
    type: "info",
    link: "/dashboard/ngo/members",
  },
  NGO_MEMBER_ADDED: {
    title: "New Member Added",
    message: "A new member has been added to your NGO.",
    type: "success",
    link: "/dashboard/ngo/members",
  },
  NGO_MEMBER_REMOVED: {
    title: "Member Removed",
    message: "A member has been removed from your NGO.",
    type: "warning",
    link: "/dashboard/ngo/members",
  },
  NGO_EVENT_CREATED: {
    title: "New Event Created",
    message: "A new event has been created in your NGO.",
    type: "success",
    link: "/dashboard/ngo/activities",
  },
  NGO_EVENT_UPDATED: {
    title: "Event Updated",
    message: "An event in your NGO has been updated.",
    type: "info",
    link: "/dashboard/ngo/activities",
  },
  NGO_EVENT_DELETED: {
    title: "Event Deleted",
    message: "An event in your NGO has been deleted.",
    type: "warning",
    link: "/dashboard/ngo/activities",
  },

  // Achievement-related notifications
  ACHIEVEMENT_UNLOCKED: {
    title: "New Achievement Unlocked!",
    message: "Congratulations! You've unlocked a new achievement.",
    type: "success",
    link: "/dashboard/user/profile",
  },
  LEVEL_UP: {
    title: "Level Up!",
    message: "Congratulations! You've reached a new level.",
    type: "success",
    link: "/dashboard/user/profile",
  },
  BADGE_EARNED: {
    title: "New Badge Earned",
    message: "You've earned a new badge for your contributions!",
    type: "success",
    link: "/dashboard/user/profile",
  },

  // System notifications
  SYSTEM_UPDATE: {
    title: "System Update",
    message: "The system has been updated with new features.",
    type: "info",
    link: "/dashboard",
  },
  MAINTENANCE_NOTICE: {
    title: "System Maintenance",
    message: "The system will undergo maintenance soon.",
    type: "warning",
    link: "/dashboard",
  },
};

// Helper function to get notification config by type
export const getNotificationConfig = (type) => {
  return (
    NOTIFICATION_TYPES[type] || {
      title: "Notification",
      message: "A new notification has been received.",
      type: "info",
    }
  );
};
