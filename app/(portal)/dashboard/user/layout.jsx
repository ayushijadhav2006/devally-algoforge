"use client";

import React, { useState, useEffect } from "react";
import { SideNav } from "@/components/SideNav";
import {
  LayoutDashboard,
  Search,
  Calendar,
  Trophy,
  Settings,
  LogOut,
  User,
  UsersRound,
  IndianRupee,
  ReceiptIndianRupee,
  Users,
  ShieldQuestion,
  ShoppingCart,
  Medal,
} from "lucide-react";
import Chatbot from "@/components/chatbot";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import Loading from "@/components/loading/Loading";
import { NotificationProvider } from "@/providers/NotificationProvider";

const NavConfig = {
  mainNavItems: [
    { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard/user" },
    {
      name: "Search Activities",
      icon: Search,
      href: "/dashboard/user/activities/search-activity",
    },
    {
      name: "Campaigns",
      icon: Settings,
      href: "/dashboard/user/campaigns/search-campaign",
    },
    {
      name: "Participated Activities",
      icon: Calendar,
      href: "/dashboard/user/activities",
    },
    {
      name: "My Donations",
      icon: IndianRupee,
      href: "/dashboard/user/donations",
    },
    {
      name: "Find NGOs",
      icon: ShieldQuestion,
      href: "/ngo",
    },
    {
      name: "Buy Merchandise",
      icon: ShoppingCart,
      href: "/dashboard/user/merchandise",
    },
    {
      name: "Achievements",
      icon: Trophy,
      href: "/dashboard/user/achievements",
    },
    {
      name: "Leaderboard",
      icon: Medal,
      href: "/dashboard/user/leaderboard",
    },
  ],
  bottomNavItems: [
    { name: "Profile", icon: User, href: "/dashboard/user/profile" },
  ],
};

const Layout = ({ children }) => {
  const [isSideNavOpen, setIsSideNavOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let notificationsUnsubscribe = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(true);
        router.push("/login");
        return;
      }

      // Set up real-time listener for notifications
      const notificationsRef = doc(db, "notifications", user.uid);

      notificationsUnsubscribe = onSnapshot(notificationsRef, (doc) => {
        if (doc.exists()) {
          const notificationsData = doc.data()?.notifications || [];
          // Sort notifications by timestamp (newest first)
          const sortedNotifications = [...notificationsData].sort((a, b) => {
            const dateA = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
            const dateB = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
            return dateB - dateA;
          });
          setNotifications(sortedNotifications);
        } else {
          setNotifications([]);
        }
        setNotificationsLoading(false);
      });

      // Continue with the existing user document check
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.type === "ngo") {
          setLoading(false);
          router.push("/dashboard/ngo");
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (notificationsUnsubscribe) {
        notificationsUnsubscribe();
      }
    };
  }, [router]);

  if (loading) {
    return <Loading />;
  }

  return (
    <NotificationProvider>
      <div className="flex min-h-screen bg-gray-100">
        <SideNav
          isOpen={isSideNavOpen}
          setIsOpen={setIsSideNavOpen}
          navConfig={NavConfig}
          type="volunteer"
        />
        <main
          className="flex-1 overflow-y-auto"
          style={{
            paddingLeft: isSideNavOpen ? "256px" : "64px",
            transition: "padding-left 0.3s",
          }}
        >
          <div className="p-4 md:p-8">{children}</div>
          <Chatbot />
        </main>
      </div>
    </NotificationProvider>
=========
    <div className="flex min-h-screen bg-gray-100">
      <SideNav
        isOpen={isSideNavOpen}
        setIsOpen={setIsSideNavOpen}
        navConfig={NavConfig}
        type="volunteer"
        notifications={notifications}
        notificationsLoading={notificationsLoading}
      />
      <main
        className="flex-1 overflow-y-auto"
        style={{
          paddingLeft: isSideNavOpen ? "256px" : "64px",
          transition: "padding-left 0.3s",
        }}
      >
        <div className="p-4 md:p-8">{children}</div>
        <Chatbot />
      </main>
    </div>
  );
};

export default Layout;
