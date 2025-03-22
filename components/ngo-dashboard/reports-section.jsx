import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext"; // Import language context
import { TranslationModal } from "@/components/TranslationModal";
import { useState } from "react";

export function ReportsSection() {
  const router = useRouter();
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const { translations } = useLanguage();
  const redirectToReports = () => {
    // Redirect to the reports page
    router.push("/dashboard/ngo/reports");
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations.reports || "Reports"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          className="w-full justify-start"
          variant="outline"
          onClick={redirectToReports}
        >
          <BarChart className="mr-2 h-4 w-4" />
          {translations.view_activities_analytics || "View Activities Analytics"}
        </Button>
      </CardContent>
      {/* Translation Modal */}
      <TranslationModal 
        isOpen={showTranslationModal} 
        onClose={() => setShowTranslationModal(false)} 
      />
    </Card>
  );
}
