import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { useState, useEffect, useMemo } from "react";
import {
  onSnapshot,
  collection,
  query,
  getDocs,
  collectionGroup,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Download, DownloadCloud } from "lucide-react";
import DonationReportPDF from "./donation-report-pdf";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

// Array of months for date formatting
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function DonationReports({ timeFrame, dateRange, donationsData }) {
  const [donations, setDonations] = useState([]);
  const [donationStats, setDonationStats] = useState({
    total: 0,
    breakdown: [],
    topDonors: [],
  });
  const [showAllCash, setShowAllCash] = useState(false);
  const [showAllOnline, setShowAllOnline] = useState(false);
  const [showAllCrypto, setShowAllCrypto] = useState(false);

  useEffect(() => {
    if (donationsData && donationsData.length > 0) {
      let filteredDonations = donationsData;
      
      if (timeFrame === "specific_month" && dateRange?.from && dateRange?.to) {
        filteredDonations = donationsData.filter(donation => {
          const donationDate = new Date(donation.donatedOn || donation.timestamp || donation.id || 0);
          return donationDate >= dateRange.from && donationDate <= dateRange.to;
        });
      }
      
      setDonations(filteredDonations);
      
      const total = filteredDonations
        .filter((donation) => donation.paymentMethod !== "Crypto")
        .reduce((sum, donation) => sum + Number(donation.amount || 0), 0);

      const methodBreakdown = filteredDonations.reduce((acc, donation) => {
        const method = donation.paymentMethod || "Other";
        acc[method] = (acc[method] || 0) + Number(donation.amount || 0);
        return acc;
      }, {});

      const breakdown = Object.entries(methodBreakdown).map(
        ([method, amount]) => ({
          method,
          amount,
        })
      );

      const topDonors = [...filteredDonations]
        .filter((donation) => donation.paymentMethod !== "Crypto")
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 3)
        .map((donor) => ({
          name: donor.name || donor.donorName,
          amount: Number(donor.amount),
          date: donor.timestamp || donor.donatedOn,
        }));

      setDonationStats({ total, breakdown, topDonors });
      return;
    }

    const fetchDonations = async () => {
      try {
        const ngoId = auth.currentUser?.uid;
        if (!ngoId) {
          console.log("No NGO ID found");
          return;
        }

        let allDonations = [];
        const currentYear = new Date().getFullYear().toString();

        // Fetch all cash donations
        const cashDonations = await getDocs(collectionGroup(db, "cash"));
        cashDonations.forEach((doc) => {
          const path = doc.ref.path;
          if (path.includes(`donations/${ngoId}/${currentYear}`)) {
            allDonations.push({
              id: doc.id,
              ...doc.data(),
              paymentMethod: "Cash",
            });
          }
        });

        // Fetch all online donations
        const onlineDonations = await getDocs(collectionGroup(db, "online"));
        onlineDonations.forEach((doc) => {
          const path = doc.ref.path;
          if (path.includes(`donations/${ngoId}/${currentYear}`)) {
            allDonations.push({
              id: doc.id,
              ...doc.data(),
              paymentMethod: "Online",
            });
          }
        });

        // Fetch all crypto donations
        const cryptoDonations = await getDocs(collectionGroup(db, "crypto"));
        cryptoDonations.forEach((doc) => {
          const path = doc.ref.path;
          if (path.includes(`donations/${ngoId}/${currentYear}`)) {
            allDonations.push({
              id: doc.id,
              ...doc.data(),
              paymentMethod: "Crypto",
            });
          }
        });

        let filteredDonations = allDonations;
        if (timeFrame === "specific_month" && dateRange?.from && dateRange?.to) {
          filteredDonations = allDonations.filter(donation => {
            const donationDate = new Date(donation.donatedOn || donation.timestamp || donation.id || 0);
            return donationDate >= dateRange.from && donationDate <= dateRange.to;
          });
        }

        setDonations(filteredDonations);

        const total = filteredDonations
          .filter((donation) => donation.paymentMethod !== "Crypto")
          .reduce((sum, donation) => sum + Number(donation.amount || 0), 0);

        const methodBreakdown = filteredDonations.reduce((acc, donation) => {
          const method = donation.paymentMethod || "Other";
          acc[method] = (acc[method] || 0) + Number(donation.amount || 0);
          return acc;
        }, {});

        const breakdown = Object.entries(methodBreakdown).map(
          ([method, amount]) => ({
            method,
            amount,
          })
        );

        const topDonors = [...filteredDonations]
          .filter((donation) => donation.paymentMethod !== "Crypto")
          .sort((a, b) => Number(b.amount) - Number(a.amount))
          .slice(0, 3)
          .map((donor) => ({
            name: donor.name || donor.donorName,
            amount: Number(donor.amount),
            date: donor.timestamp || donor.donatedOn,
          }));

        setDonationStats({ total, breakdown, topDonors });
      } catch (error) {
        console.error("Error fetching donations:", error);
      }
    };

    fetchDonations();
  }, [donationsData, dateRange, timeFrame]);

  // Filter functions for different donation types and sort by date
  const cashDonations = donations
    .filter((d) => {
      if (d.paymentMethod !== "Cash") return false;
      
      const donationDate = new Date(d.donatedOn || d.timestamp || 0);
      
      if (timeFrame === "specific_month" && dateRange?.from && dateRange?.to) {
        return donationDate >= dateRange.from && donationDate <= dateRange.to;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.donatedOn || a.timestamp || 0);
      const dateB = new Date(b.donatedOn || b.timestamp || 0);
      return dateB - dateA;
    });

  const onlineDonations = donations
    .filter((d) => {
      if (d.paymentMethod !== "Online") return false;
      
      const donationDate = new Date(d.timestamp || d.id || 0);
      
      if (timeFrame === "specific_month" && dateRange?.from && dateRange?.to) {
        return donationDate >= dateRange.from && donationDate <= dateRange.to;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.timestamp || a.id || 0);
      const dateB = new Date(b.timestamp || b.id || 0);
      return dateB - dateA;
    });

  const cryptoDonations = donations
    .filter((d) => {
      if (d.paymentMethod !== "Crypto") return false;
      
      const donationDate = new Date(d.timestamp || d.id || 0);
      
      if (timeFrame === "specific_month" && dateRange?.from && dateRange?.to) {
        return donationDate >= dateRange.from && donationDate <= dateRange.to;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.timestamp || a.id || 0);
      const dateB = new Date(b.timestamp || b.id || 0);
      return dateB - dateA;
    });

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    if (!(date instanceof Date) || isNaN(date)) return "Invalid date";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Memoize the PDF data to prevent unnecessary recalculations
  const pdfData = useMemo(() => {
    try {
      // Basic validation
      if (!donations || !donationStats) {
        return null;
      }

      // Format the date range
      const timeFrameString = (() => {
        if (timeFrame !== "specific_month" || !dateRange?.from) {
          return "All Time";
        }
        const date = new Date(dateRange.from);
        return isNaN(date.getTime()) 
          ? "All Time" 
          : `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
      })();

      // Format donations data
      const formatDonationList = (list) => {
        if (!Array.isArray(list)) return [];
        return list.slice(0, 5).map(donation => ({
          name: donation.name || donation.donorName || "Anonymous",
          amount: Number(donation.amount || 0),
          date: formatDate(donation.timestamp || donation.donatedOn || donation.id || new Date())
        }));
      };

      // Calculate totals
      const total = Number(donationStats.total || 0);
      const cryptoTotal = donations
        .filter(d => d.paymentMethod === "Crypto")
        .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

      // Get unique donors
      const uniqueDonors = new Set(
        donations
          .filter(d => d.name || d.donorName)
          .map(d => d.name || d.donorName)
      );

      return {
        ngoInfo: {
          name: auth.currentUser?.displayName || "Your NGO Name",
          address: "Your NGO Address",
          email: auth.currentUser?.email || "your@email.com",
        },
        timeFrame: timeFrameString,
        date: new Date().toLocaleDateString(),
        total,
        cryptoTotal,
        totalDonors: uniqueDonors.size,
        breakdown: donationStats.breakdown.map(item => ({
          method: item.method || "Unknown",
          amount: Number(item.amount || 0)
        })),
        cashDonations: formatDonationList(cashDonations),
        onlineDonations: formatDonationList(onlineDonations),
        cryptoDonations: formatDonationList(cryptoDonations)
      };
    } catch (error) {
      console.error("Error preparing PDF data:", error);
      return null;
    }
  }, [donations, donationStats, timeFrame, dateRange, cashDonations, onlineDonations, cryptoDonations, auth.currentUser]);

  // Function to get safe filename
  const getReportFileName = () => {
    if (timeFrame === "specific_month" && dateRange?.from) {
      const date = new Date(dateRange.from);
      if (!isNaN(date.getTime())) {
        return `donation-report-${MONTHS[date.getMonth()]}-${date.getFullYear()}.pdf`;
      }
    }
    return "donation-report-all-time.pdf";
  };

  return (
    <div className="space-y-6">

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${donationStats.total.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Excluding cryptocurrency donations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Donation Methods</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={donationStats.breakdown}
                  dataKey="amount"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label
                >
                  {donationStats.breakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Donors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {donationStats.topDonors.map((donor, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{donor.name}</span>
                  <span className="font-medium">
                    ${donor.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {timeFrame === "specific_month" 
              ? `Donation Summary for ${MONTHS[new Date(dateRange.from).getMonth()]} ${new Date(dateRange.from).getFullYear()}`
              : "Donation Summary"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Method</TableHead>
                <TableHead>Number of Donations</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Average Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Cash</TableCell>
                <TableCell>{cashDonations.length}</TableCell>
                <TableCell>
                  ${cashDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0).toLocaleString()}
                </TableCell>
                <TableCell>
                  ${cashDonations.length > 0 
                    ? (cashDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0) / cashDonations.length).toLocaleString()
                    : '0'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>UPI/Online</TableCell>
                <TableCell>{onlineDonations.length}</TableCell>
                <TableCell>
                  ${onlineDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0).toLocaleString()}
                </TableCell>
                <TableCell>
                  ${onlineDonations.length > 0
                    ? (onlineDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0) / onlineDonations.length).toLocaleString()
                    : '0'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Cryptocurrency</TableCell>
                <TableCell>{cryptoDonations.length}</TableCell>
                <TableCell>
                  ${cryptoDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0).toLocaleString()}
                </TableCell>
                <TableCell>
                  ${cryptoDonations.length > 0
                    ? (cryptoDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0) / cryptoDonations.length).toLocaleString()
                    : '0'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Cash Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Donor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(showAllCash ? cashDonations : cashDonations.slice(0, 5)).map(
                  (donation, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {formatDate(donation.donatedOn || donation.timestamp)}
                      </TableCell>
                      <TableCell>${donation.amount}</TableCell>
                      <TableCell>{donation.name || donation.donorName}</TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
            {cashDonations.length > 5 && (
              <Button
                variant="link"
                onClick={() => setShowAllCash(!showAllCash)}
                className="mt-2"
              >
                {showAllCash ? "Show Less" : "View More"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Online Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Donor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(showAllOnline
                  ? onlineDonations
                  : onlineDonations.slice(0, 5)
                ).map((donation, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {formatDate(donation.timestamp)}
                    </TableCell>
                    <TableCell>${donation.amount}</TableCell>
                    <TableCell>{donation.name || donation.donorName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {onlineDonations.length > 5 && (
              <Button
                variant="link"
                onClick={() => setShowAllOnline(!showAllOnline)}
                className="mt-2"
              >
                {showAllOnline ? "Show Less" : "View More"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Crypto Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Donor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(showAllCrypto
                  ? cryptoDonations
                  : cryptoDonations.slice(0, 5)
                ).map((donation, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {formatDate(donation.timestamp)}
                    </TableCell>
                    <TableCell>${donation.amount}</TableCell>
                    <TableCell>{donation.name || donation.donorName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {cryptoDonations.length > 5 && (
              <Button
                variant="link"
                onClick={() => setShowAllCrypto(!showAllCrypto)}
                className="mt-2"
              >
                {showAllCrypto ? "Show Less" : "View More"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end mt-4">
        {pdfData ? (
          <PDFDownloadLink
            document={<DonationReportPDF data={pdfData} />}
            fileName={getReportFileName()}
          >
            {({ blob, url, loading, error }) => (
              <Button disabled={loading || error}>
                <DownloadCloud className="mr-2 h-4 w-4" />
                {loading ? "Generating PDF..." : "Download Report"}
              </Button>
            )}
          </PDFDownloadLink>
        ) : (
          <Button disabled>
            <DownloadCloud className="mr-2 h-4 w-4" />
            No data available
          </Button>
        )}
      </div>
    </div>
  );
}
