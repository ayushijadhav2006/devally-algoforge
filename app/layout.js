import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import Providers from "@/providers/WebProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SMILE-SHARE",
  description: "Smile-Share is a platform for NGOs to manage their activities and events.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}
