import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/context/LanguageContext";

// Array of international languages
const internationalLanguages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
];

// Array of Indian languages
const indianLanguages = [
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "pa", name: "Punjabi" },
  { code: "or", name: "Odia" },
  { code: "as", name: "Assamese" },
  { code: "ur", name: "Urdu" },
];

export function TranslationModal({ isOpen, onClose }) {
  const { language, setLanguage, translations } = useLanguage();
  const [selectedTab, setSelectedTab] = useState("international");
  const [selectedLanguage, setSelectedLanguage] = useState(language);

  const handleLanguageSelect = (langCode) => {
    setSelectedLanguage(langCode);
  };

  const handleApply = () => {
    setLanguage(selectedLanguage);
    onClose();
  };

  const LanguageButton = ({ langCode, langName, isSelected }) => (
    <Button
      variant={isSelected ? "default" : "outline"}
      className={`w-full justify-start mb-2 ${
        isSelected ? "bg-[#1CAC78] text-white" : ""
      }`}
      onClick={() => handleLanguageSelect(langCode)}
    >
      {langName}
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translations.select_language || "Select Language"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="international" value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="international">
              {translations.international || "International"}
            </TabsTrigger>
            <TabsTrigger value="indian">
              {translations.indian || "Indian"}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="international">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2 mt-2">
                {internationalLanguages.map((lang) => (
                  <LanguageButton
                    key={lang.code}
                    langCode={lang.code}
                    langName={lang.name}
                    isSelected={selectedLanguage === lang.code}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="indian">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2 mt-2">
                {indianLanguages.map((lang) => (
                  <LanguageButton
                    key={lang.code}
                    langCode={lang.code}
                    langName={lang.name}
                    isSelected={selectedLanguage === lang.code}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            {translations.cancel || "Cancel"}
          </Button>
          <Button className="bg-[#1CAC78]" onClick={handleApply}>
            {translations.apply || "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}