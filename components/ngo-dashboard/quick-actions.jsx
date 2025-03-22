"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, UserCheck, DollarSign, Award, Globe } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext"; // Import language context
import { useState } from "react";
import { TranslationModal } from "@/components/TranslationModal"; // Import TranslationModal

export function QuickActions() {
  const { translations } = useLanguage(); // Use language context
  const [showTranslationModal, setShowTranslationModal] = useState(false);

  // Define actions with translations
  const actions = [
    {
      label: translations.create_event || "Create Event",
      icon: PlusCircle,
      href: "/dashboard/ngo/activities/new",
    },
    { 
      label: translations.add_members || "Add Members", 
      icon: UserCheck, 
      href: "/dashboard/ngo/members" 
    },
    {
      label: translations.view_donations || "View our Donations",
      icon: DollarSign,
      href: "/dashboard/ngo/donations/",
    },
    { 
      label: translations.view_reports || "View Reports", 
      icon: Award, 
      href: "/dashboard/ngo/reports" 
    },
  ];

  // Toggle translation modal
  const toggleTranslationModal = () => {
    setShowTranslationModal(!showTranslationModal);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{translations.quick_actions || "Quick Actions"}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {actions.map((action, index) => (
          <Link
            key={index}
            variant="outline"
            className="w-full justify-start border-black/40 transition-colors duration-200 flex items-center gap-2 rounded-lg border-2 p-1 hover:bg-gray-50"
            href={action.href}
          >
            <action.icon className="mr-2 h-4 w-4" />
            {action.label}
          </Link>
        ))}
      </CardContent>
      
      {/* Translation Modal */}
      <TranslationModal 
        isOpen={showTranslationModal} 
        onClose={() => setShowTranslationModal(false)} 
      />
    </Card>
  );
}