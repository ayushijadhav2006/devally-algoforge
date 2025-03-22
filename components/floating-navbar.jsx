"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X, ExternalLink, Globe, Bell } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { TranslationModal } from "@/components/TranslationModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const { language, translations } = useLanguage();

  useEffect(() => {
    // Auth state listener
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user || null);

      // If user is authenticated, subscribe to their document
      if (user) {
        // Subscribe to user data
        const userDocRef = doc(db, "users", user.uid);
        const userUnsubscribe = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data());
          }
        });

        // Subscribe to user notifications
        const notificationsRef = doc(db, "notifications", user.uid);
        const notificationsUnsubscribe = onSnapshot(notificationsRef, (doc) => {
          if (doc.exists()) {
            const notificationsData = doc.data()?.notifications || [];
            setNotifications(notificationsData);
            setHasUnread(notificationsData.some((n) => !n.read));
          }
        });

        return () => {
          userUnsubscribe();
          notificationsUnsubscribe();
        };
      } else {
        setUserData(null);
        setNotifications([]);
        setHasUnread(false);
      }
    });

    // Add scroll event listener
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      authUnsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const logoutHandler = useCallback(async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  }, [router]);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  // Define nav items with translations
  const getNavItems = () => [
    { title: translations.home || "Home", href: "/" },
    { title: translations.about || "About", href: "/about" },
    { title: translations.pricing || "Pricing", href: "/pricing" },
    { title: translations.contact || "Contact", href: "/contact" },
    { title: translations.ngo || "NGO", href: "/ngo" },
  ];

  const navItems = getNavItems();

  // Get user role or type from userData
  const userRole = userData?.role || userData?.userType || "user";

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        scrolled
          ? "bg-background/95 backdrop-blur-md shadow-sm"
          : "bg-background/80 backdrop-blur-sm border-b border-border"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - Left side */}
          <Link href="/" className="flex items-center group">
            <div className="relative overflow-hidden">
              <Image
                src="/logo.png"
                alt="Smile-Share"
                width={150}
                height={40}
                className="h-10 w-auto transition-transform duration-300 group-hover:scale-105"
                priority
              />
            </div>
            <span className="text-xl font-semibold ml-2 transition-colors duration-300 group-hover:text-emerald-500">
              Smile-Share
            </span>
          </Link>

          {/* Language toggle button */}
          <div className="hidden md:flex items-center">
            <Button
              onClick={() => setShowTranslationModal(true)}
              className="bg-transparent hover:bg-foreground/10 text-foreground border-foreground/20 px-3 py-1 rounded-full text-sm flex items-center transition-all duration-300 hover:ring-2 hover:ring-emerald-500/30"
              variant="outline"
              size="sm"
            >
              <Globe className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">
                {translations.translate || "Translate"}
              </span>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden flex items-center p-2 rounded-full hover:bg-foreground/10 transition-colors"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* Right side container for nav + auth */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Navigation - Now on the right side */}
            <nav className="flex items-center mr-4">
              {navItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="relative px-3 py-2 text-sm font-medium rounded-md hover:bg-accent/50 transition-all duration-300 group flex items-center mx-0.5"
                  target={item.external ? "_blank" : "_self"}
                  rel={item.external ? "noopener noreferrer" : ""}
                >
                  <span>{item.title}</span>
                  {item.external && <ExternalLink className="ml-1 h-3 w-3" />}
                  <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-emerald-500 group-hover:w-2/3 transition-all duration-300 -translate-x-1/2"></span>
                </Link>
              ))}
            </nav>

            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Notifications */}
                {userData && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative rounded-full"
                      >
                        <Bell className="h-5 w-5" />
                        {hasUnread && (
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-500 rounded-full" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-72 max-h-[300px] overflow-y-auto p-2"
                    >
                      <h3 className="font-medium text-sm px-2 pb-2 border-b">
                        Notifications
                      </h3>
                      {notifications.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2">
                          No notifications
                        </p>
                      ) : (
                        notifications.map((notification, index) => (
                          <DropdownMenuItem
                            key={index}
                            className={cn(
                              "flex flex-col items-start p-2 rounded-md cursor-pointer",
                              !notification.read && "bg-accent/50"
                            )}
                          >
                            <p className="text-sm font-medium">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(
                                notification.timestamp?.toDate?.() ||
                                  notification.timestamp
                              ).toLocaleString()}
                            </p>
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* User status badge - conditional rendering */}
                {userData?.verificationStatus === "pending" && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    Verification Pending
                  </span>
                )}

                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-full font-medium hover:opacity-90 transition-all duration-300 hover:shadow-md hover:shadow-emerald-500/20"
                >
                  {translations.dashboard || "Dashboard"}
                </Link>

                <Button
                  onClick={logoutHandler}
                  variant="outline"
                  className="rounded-full transition-all duration-300 hover:border-red-400 hover:text-red-500"
                >
                  {translations.sign_out || "Sign Out"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className={cn(
                    "px-4 py-2 rounded-full font-medium transition-all duration-300",
                    "border-2 border-foreground/20",
                    "text-foreground",
                    "hover:bg-foreground/10 hover:border-foreground/30"
                  )}
                >
                  {translations.sign_in || "Sign In"}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-full font-medium transition-all duration-300 hover:shadow-md hover:shadow-emerald-500/20 hover:scale-105"
                >
                  {translations.sign_up || "Sign Up"}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden p-4 bg-background/95 backdrop-blur-md border-t border-border animate-in slide-in-from-top duration-300">
          <nav className="flex flex-col space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent/50 transition-all duration-300 flex items-center"
                onClick={toggleMenu}
                target={item.external ? "_blank" : "_self"}
                rel={item.external ? "noopener noreferrer" : ""}
              >
                {item.title}
                {item.external && <ExternalLink className="ml-1 h-3 w-3" />}
              </Link>
            ))}

            {/* Language toggle in mobile menu */}
            <Button
              onClick={() => {
                setShowTranslationModal(true);
                toggleMenu();
              }}
              className="justify-start w-full px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent/50 transition-all duration-300 flex items-center"
              variant="ghost"
            >
              <Globe className="h-4 w-4 mr-2" />
              {translations.translate || "Translate"}
            </Button>

            {/* Auth Buttons (Mobile) */}
            <div className="pt-2 border-t border-border/40">
              {user ? (
                <div className="flex flex-col space-y-2">
                  {/* Display verification status if relevant */}
                  {userData?.verificationStatus === "pending" && (
                    <div className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md text-center">
                      Verification Pending
                    </div>
                  )}

                  {/* Notifications for mobile */}
                  {userData && notifications.length > 0 && (
                    <Button
                      variant="outline"
                      className="relative flex justify-start items-center py-2.5 w-full"
                      onClick={() => router.push("/notifications")}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Notifications
                      {hasUnread && (
                        <span className="absolute top-2 left-7 h-2 w-2 bg-red-500 rounded-full" />
                      )}
                    </Button>
                  )}

                  <Link
                    href="/dashboard"
                    className="px-3 py-2.5 text-sm font-medium bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-md hover:opacity-90 transition-all duration-300 text-center"
                    onClick={toggleMenu}
                  >
                    {translations.dashboard || "Dashboard"}
                  </Link>
                  <Button
                    onClick={() => {
                      logoutHandler();
                      toggleMenu();
                    }}
                    variant="outline"
                    className="w-full justify-center rounded-md py-2.5 hover:border-red-400 hover:text-red-500 transition-all duration-300"
                  >
                    {translations.sign_out || "Sign Out"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2">
                  <Link
                    href="/login"
                    className="px-3 py-2.5 text-sm font-medium border border-foreground/20 rounded-md text-foreground hover:bg-foreground/10 transition-all duration-300 text-center"
                    onClick={toggleMenu}
                  >
                    {translations.sign_in || "Sign In"}
                  </Link>
                  <Link
                    href="/register"
                    className="px-3 py-2.5 text-sm font-medium bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-md hover:opacity-90 transition-all duration-300 text-center"
                    onClick={toggleMenu}
                  >
                    {translations.sign_up || "Sign Up"}
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Translation Modal */}
      <TranslationModal
        isOpen={showTranslationModal}
        onClose={() => setShowTranslationModal(false)}
      />
    </header>
  );
}
