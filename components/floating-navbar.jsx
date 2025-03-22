"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X, Plus, ExternalLink, Globe } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useLanguage } from "@/context/LanguageContext"; // Import language context
import { TranslationModal } from "@/components/TranslationModal"; // Import TranslationModal
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const { language, translations } = useLanguage(); // Use language context

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user || null);
    });

    return () => unsubscribe();
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

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - Left side */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="NGO-Connect"
              width={150}
              height={40}
              className="h-10 w-auto"
              priority
            />
            <span className="text-xl font-semibold ml-2">NGO Connect</span>
          </Link>

          {/* Language toggle button */}
          <Button
            onClick={() => setShowTranslationModal(true)}
            className="ml-96 -mr-16 bg-transparent hover:bg-foreground/10 text-foreground border-foreground/20 px-3 py-1 rounded-full text-sm flex items-center"
            variant="outline"
            size="sm"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{translations.translate || "Translate"}</span>
          </Button>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden flex items-center"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          {/* Right side container for nav + auth */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Navigation - Now on the right side */}
            <nav className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors flex items-center"
                  target={item.external ? "_blank" : "_self"}
                  rel={item.external ? "noopener noreferrer" : ""}
                >
                  {item.title}
                  {item.external && <ExternalLink className="ml-1 h-3 w-3" />}
                </Link>
              ))}
            </nav>

            {/* Auth Buttons */}
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
                >
                  {translations.dashboard || "Dashboard"}
                </Link>

                <ConnectButton />

                <Button
                  onClick={logoutHandler}
                  variant="outline"
                  className="rounded-full"
                >
                  {translations.sign_out || "Sign Out"}
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(
                    "px-4 py-2 rounded-full font-medium transition-colors",
                    "border-2 border-foreground/20",
                    "text-foreground",
                    "hover:bg-foreground/10"
                  )}
                >
                  {translations.sign_in || "Sign In"}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
                >
                  {translations.sign_up || "Sign Up"}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden p-4 bg-background border-t border-border">
          <nav className="flex flex-col space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors flex items-center"
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
              className="justify-start w-full px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors flex items-center"
              variant="ghost"
            >
              <Globe className="h-4 w-4 mr-2" />
              {translations.translate || "Translate"}
            </Button>

            {/* Auth Buttons (Mobile) */}
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-3 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-md hover:opacity-90 transition-opacity"
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
                  className="w-full justify-start"
                >
                  {translations.sign_out || "Sign Out"}
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm font-medium border border-foreground/20 rounded-md text-foreground hover:bg-foreground/10 transition-colors"
                  onClick={toggleMenu}
                >
                  {translations.sign_in || "Sign In"}
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-md hover:opacity-90 transition-opacity"
                  onClick={toggleMenu}
                >
                  {translations.sign_up || "Sign Up"}
                </Link>
              </>
            )}
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