"use client";

import { motion } from "framer-motion";
import {
  Download,
  FileText,
  BarChart,
  MessageCircle,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase"; // Import Firebase
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
} from "firebase/firestore";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { TranslationModal } from "@/components/TranslationModal";
import {
  sendNotificationToUser,
  sendNotificationToNGO,
} from "@/lib/notificationService";
import { NOTIFICATION_TYPES } from "@/lib/notificationTypes";
import toast from "react-hot-toast";

export default function UserDonatePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [donationOverview, setDonationOverview] = useState({
    totalDonations: 0,
    sponsoredEvents: 0,
    upcomingRecurring: 0,
  });
  const [recentDonations, setRecentDonations] = useState([]);
  const [donorInfo, setDonorInfo] = useState({
    name: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const { language, translations } = useLanguage();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;

        if (!user) {
          console.error("No user logged in");
          setLoading(false);
          return;
        }

        const userId = user.uid;

        // Fetch user profile data
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          // Set donor info
          setDonorInfo({
            name: userData.name || userData.displayName || "",
            email: userData.email || user.email || "",
          });

          // Set total donations
          setDonationOverview((prev) => ({
            ...prev,
            totalDonations: userData.totalDonated || 0,
          }));
        }

        // Fetch donation count (to how many NGOs)
        const donateToRef = collection(db, "users", userId, "donatedTo");
        const donateToSnap = await getDocs(donateToRef);
        const uniqueNgos = new Set();

        donateToSnap.forEach((doc) => {
          uniqueNgos.add(doc.id);
        });

        setDonationOverview((prev) => ({
          ...prev,
          sponsoredEvents: uniqueNgos.size,
        }));

        // Get current date information for fetching current month donations
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear().toString();
        const currentMonth = currentDate.getMonth().toString(); // 0-indexed months
        console.log(currentMonth, currentYear);
        // Fetch recent donations
        const recentDonationsArray = [];

        for (const ngoId of uniqueNgos) {
          // Fetch NGO name
          const ngoRef = doc(db, "ngo", ngoId);
          const ngoSnap = await getDoc(ngoRef);
          const ngoName = ngoSnap.exists()
            ? ngoSnap.data().ngoName
            : "Unknown NGO";

          // Fetch donations for this NGO
          console.log(userId);
          const donationsPath = `users/${userId}/${currentYear}/${currentMonth}/${ngoId}`;
          const donationsRef = collection(db, donationsPath);
          const donationsSnap = await getDocs(donationsRef);

          donationsSnap.forEach((donationDoc) => {
            const donationData = donationDoc.data();
            recentDonationsArray.push({
              id: donationDoc.id,
              ngo: ngoName,
              amount: donationData.amount || 0,
              date: donationData.donatedOn
                ? new Date(donationData.donatedOn.seconds * 1000)
                    .toISOString()
                    .split("T")[0]
                : "",
              method: donationData.type || "Unknown",
              status: "Completed", // Assuming all stored donations are completed
              ngoId: ngoId,
            });
          });
        }

        // Sort by date (newest first) and set state
        recentDonationsArray.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        setRecentDonations(recentDonationsArray);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Function to create a printable window with the tax receipt
  const generateTaxReceipt = () => {
    setIsGenerating(true);

    try {
      // Get completed donations
      const completedDonations = recentDonations.filter(
        (d) => d.status === "Completed"
      );

      // Calculate total amount
      const totalAmount = completedDonations.reduce(
        (sum, d) => sum + d.amount,
        0
      );

      // Create receipt number
      const receiptNumber = `R-${Math.floor(Math.random() * 10000)}-${new Date().getFullYear()}`;

      // Generate receipt date
      const receiptDate = new Date().toISOString().split("T")[0];

      // Create HTML content for the receipt
      let receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${translations.tax_receipt_for_donations || "Tax Receipt for Donations"}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { color: #1CAC78; text-align: center; font-size: 24px; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
            .info-line { margin: 5px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background-color: #1CAC78; color: white; text-align: left; padding: 8px; }
            td { border: 1px solid #ddd; padding: 8px; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .total { font-weight: bold; margin: 20px 0; }
            .disclaimer { font-size: 10px; margin-top: 30px; font-style: italic; }
            .signature { text-align: right; margin-top: 50px; }
            @media print {
              button { display: none; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">${translations.tax_receipt_for_donations || "Tax Receipt for Donations"}</div>
          
          <div class="section">
            <div class="section-title">${translations.donor_details || "Donor Details"}:</div>
            <div class="info-line">${translations.name || "Name"}: ${donorInfo.name}</div>
            <div class="info-line">${translations.email || "Email"}: ${donorInfo.email}</div>
          </div>
          
          <div class="section">
            <div class="section-title">${translations.receipt_details || "Receipt Details"}:</div>
            <div class="info-line">${translations.receipt_date || "Receipt Date"}: ${receiptDate}</div>
            <div class="info-line">${translations.receipt_number || "Receipt Number"}: ${receiptNumber}</div>
          </div>
          
          <div class="section">
            <div class="section-title">${translations.donation_details || "Donation Details"}:</div>
            <table>
              <thead>
                <tr>
                  <th>${translations.organization || "Organization"}</th>
                  <th>${translations.amount || "Amount"}</th>
                  <th>${translations.date || "Date"}</th>
                  <th>${translations.payment_method || "Payment Method"}</th>
                  <th>${translations.deduction_type || "Deduction Type"}</th>
                </tr>
              </thead>
              <tbody>
      `;

      // Add rows for donations
      completedDonations.forEach((donation) => {
        receiptHTML += `
          <tr>
            <td>${donation.ngo}</td>
            <td>₹${donation.amount}</td>
            <td>${donation.date}</td>
            <td>${donation.method}</td>
            <td>80G</td>
          </tr>
        `;
      });

      // Complete the HTML
      receiptHTML += `
              </tbody>
            </table>
            
            <div class="total">${translations.total_donations || "Total Donations"}: ₹${totalAmount}</div>
          </div>
          
          <div class="disclaimer">
            ${translations.receipt_disclaimer || "This receipt is electronically generated and is valid for income tax purposes under Section 80G of the Income Tax Act, 1961."}
          </div>
          
          <div class="signature">
            ${translations.authorized_signatory || "Authorized Signatory"}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <button onclick="window.print()">${translations.print_receipt || "Print Receipt"}</button>
          </div>
        </body>
        </html>
      `;

      // Open in a new window
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
      } else {
        alert(
          translations.allow_popups_message ||
            "Please allow popups for this website to view and print tax receipts."
        );
      }
    } catch (error) {
      console.error("Error generating tax receipt:", error);
      alert(
        translations.failed_receipt_generation ||
          "Failed to generate tax receipt. Please try again later."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to open individual receipt in new window
  const viewIndividualReceipt = (donation) => {
    try {
      // Create receipt number
      const receiptNumber = `R-${donation.id}-${new Date().getFullYear()}`;

      // Create HTML content for the individual receipt
      let receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${translations.donation_receipt || "Donation Receipt"}: ${donation.ngo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { color: #1CAC78; text-align: center; font-size: 24px; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
            .info-line { margin: 5px 0; font-size: 12px; }
            .disclaimer { font-size: 10px; margin-top: 30px; font-style: italic; }
            .signature { text-align: right; margin-top: 50px; }
            @media print {
              button { display: none; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">${translations.donation_receipt || "Donation Receipt"}: ${donation.ngo}</div>
          
          <div class="section">
            <div class="section-title">${translations.donor_details || "Donor Details"}:</div>
            <div class="info-line">${translations.name || "Name"}: ${donorInfo.name}</div>
            <div class="info-line">${translations.email || "Email"}: ${donorInfo.email}</div>
          </div>
          
          <div class="section">
            <div class="section-title">${translations.donation_details || "Donation Details"}:</div>
            <div class="info-line">${translations.organization || "Organization"}: ${donation.ngo}</div>
            <div class="info-line">${translations.amount || "Amount"}: ₹${donation.amount}</div>
            <div class="info-line">${translations.date || "Date"}: ${donation.date}</div>
            <div class="info-line">${translations.payment_method || "Payment Method"}: ${donation.method}</div>
            <div class="info-line">${translations.status || "Status"}: ${donation.status}</div>
            <div class="info-line">${translations.receipt_number || "Receipt Number"}: ${receiptNumber}</div>
          </div>
          
          <div class="disclaimer">
            ${translations.receipt_disclaimer || "This receipt is electronically generated and is valid for income tax purposes under Section 80G of the Income Tax Act, 1961."}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <button onclick="window.print()">${translations.print_receipt || "Print Receipt"}</button>
          </div>
        </body>
        </html>
      `;

      // Open in a new window
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
      } else {
        alert(
          translations.allow_popups_message ||
            "Please allow popups for this website to view and print tax receipts."
        );
      }
    } catch (error) {
      console.error("Error generating individual receipt:", error);
      alert(
        translations.failed_receipt_generation ||
          "Failed to generate receipt. Please try again later."
      );
    }
  };

  const handleDonation = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get NGO details
      const ngoDoc = await getDoc(doc(db, "ngo", selectedNGO));
      if (!ngoDoc.exists()) {
        throw new Error("NGO not found");
      }

      const ngoData = ngoDoc.data();
      const donationAmount = parseFloat(donationData.amount);

      // Create donation record
      const donationRef = doc(collection(db, "donations"));
      const donationData = {
        userId: user.uid,
        ngoId: selectedNGO,
        amount: donationAmount,
        currency: "INR",
        status: "processing",
        timestamp: new Date(),
        paymentMethod: "crypto",
      };

      await setDoc(donationRef, donationData);

      // Send processing notification to user
      await sendNotificationToUser(user.uid, "DONATION_PROCESSING", {
        message: `Your donation of ₹${donationAmount} to ${ngoData.ngoName} is being processed`,
      });

      // Send notification to NGO
      await sendNotificationToNGO(selectedNGO, "DONATION_RECEIVED", {
        message: `A new donation of ₹${donationAmount} is being processed`,
      });

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update donation status
      await updateDoc(donationRef, {
        status: "completed",
        completedAt: new Date(),
      });

      // Update NGO's total donations
      await updateDoc(doc(db, "ngo", selectedNGO), {
        totalDonations: increment(donationAmount),
      });

      // Update user's donation history
      await updateDoc(doc(db, "users", user.uid), {
        donatedTo: arrayUnion({
          ngoId: selectedNGO,
          amount: donationAmount,
          timestamp: new Date(),
        }),
      });

      // Send completion notification to user
      await sendNotificationToUser(user.uid, "DONATION_COMPLETED", {
        message: `Your donation of ₹${donationAmount} to ${ngoData.ngoName} has been completed successfully`,
      });

      // Send completion notification to NGO
      await sendNotificationToNGO(selectedNGO, "DONATION_COMPLETED", {
        message: `A donation of ₹${donationAmount} has been completed successfully`,
      });

      toast({
        title: "Success",
        description: "Donation completed successfully",
        variant: "default",
      });

      // Reset form
      setDonationData({
        amount: "",
        ngo: "",
      });
      setSelectedNGO("");
    } catch (error) {
      console.error("Error processing donation:", error);

      // Send failure notification to user
      if (auth.currentUser) {
        await sendNotificationToUser(auth.currentUser.uid, "DONATION_FAILED", {
          message:
            "There was an issue processing your donation. Please try again.",
        });
      }

      toast({
        title: "Error",
        description: "Failed to process donation",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4 space-y-8"
    >
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">
          {translations.donations || "Donations"}
        </h1>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => setShowTranslationModal(true)}
        >
          <Globe className="h-4 w-4" />
          <span>{translations.translate || "Translate"}</span>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"
            role="status"
          >
            <span className="sr-only">
              {translations.loading || "Loading..."}
            </span>
          </div>
          <p className="mt-2 text-gray-600">
            {translations.loading_donations || "Loading your donation data..."}
          </p>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {translations.donations_overview || "Donations Overview"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <h3 className="text-2xl font-bold">
                    ₹{donationOverview.totalDonations}
                  </h3>
                  <p className="text-gray-500">
                    {translations.total_donations_made ||
                      "Total Donations Made"}
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold">
                    {donationOverview.sponsoredEvents}
                  </h3>
                  <p className="text-gray-500">
                    {translations.total_ngos_supported ||
                      "Total NGOs Supported"}
                  </p>
                </div>
                {/* <div className="text-center">
                  <h3 className="text-2xl font-bold">
                    ₹{donationOverview.upcomingRecurring}
                  </h3>
                  <p className="text-gray-500">{translations.upcoming_recurring_donations || "Upcoming Recurring Donations"}</p>
                </div> */}
              </div>
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={generateTaxReceipt}
                  disabled={isGenerating || recentDonations.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isGenerating
                    ? translations.generating || "Generating..."
                    : translations.download_tax_receipt ||
                      "Download Tax Receipt"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {recentDonations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {translations.recent_donations || "Recent Donations"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{translations.ngo || "NGO"}</TableHead>
                      <TableHead>{translations.amount || "Amount"}</TableHead>
                      <TableHead>{translations.date || "Date"}</TableHead>
                      <TableHead>
                        {translations.payment_method || "Payment Method"}
                      </TableHead>
                      <TableHead>{translations.status || "Status"}</TableHead>
                      <TableHead>{translations.actions || "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDonations.map((donation) => (
                      <TableRow key={`${donation.ngoId}-${donation.id}`}>
                        <TableCell>{donation.ngo}</TableCell>
                        <TableCell>₹{donation.amount}</TableCell>
                        <TableCell>{donation.date}</TableCell>
                        <TableCell>{donation.method}</TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {translations[donation.status.toLowerCase()] ||
                              donation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewIndividualReceipt(donation)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            {translations.view_receipt || "View Receipt"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p>
                  {translations.no_donations_yet ||
                    "You haven't made any donations yet."}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="text-center space-x-4">
            <Link href="/ngo">
              <Button className="bg-[#1CAC78] hover:bg-[#158f63]">
                {translations.donate_to_cause || "Donate to a Cause Now!"}
              </Button>
            </Link>
          </div>
        </>
      )}

      {/* Translation Modal */}
      <TranslationModal
        isOpen={showTranslationModal}
        onClose={() => setShowTranslationModal(false)}
      />
    </motion.div>
  );
}
