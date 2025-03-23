"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { collectionGroup, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { 
  startOfWeek, 
  endOfWeek, 
  format, 
  addDays, 
  subWeeks, 
  parseISO, 
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameMonth,
  getMonth,
  getYear,
  differenceInDays,
} from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export function DonationsDashboard() {
  const [donationStats, setDonationStats] = useState({
    totalDonated: 0,
    cashDonated: 0,
    onlineDonated: 0,
    cryptoDonated: 0,
    allDonations: [],
    cashDonations: [],
    onlineDonations: [],
    cryptoDonations: [],
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("all"); // all, cash, online, crypto
  const [userData, setUserData] = useState(null);
  
  // Date range state
  const [timeFrame, setTimeFrame] = useState("week"); // day, week, month, year, custom
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState("thisWeek"); // thisWeek, lastWeek
  const [selectedMonth, setSelectedMonth] = useState("thisMonth"); // thisMonth, lastMonth
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [chartData, setChartData] = useState([]);
  const [chartType, setChartType] = useState("bar"); // bar, line

  useEffect(() => {
    // First fetch user data to determine the correct NGO ID
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log("No user found");
          setLoading(false);
          return;
        }

        // Get user document to check role and type
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (!userDoc.exists()) {
          console.log("User document not found");
          setLoading(false);
          return;
        }

        const userDataFromFirestore = userDoc.data();
        setUserData(userDataFromFirestore);

        // Now that we have user data, set up the donation listeners
        setupRealtimeListeners(userDataFromFirestore);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (!loading) {
      updateChartData();
    }
  }, [
    timeFrame,
    selectedDay,
    selectedWeek,
    selectedMonth,
    selectedYear,
    dateRange,
    viewMode,
    loading,
    donationStats,
  ]);

  // Set up real-time listeners for all donation types
  const setupRealtimeListeners = async (userDataFromFirestore) => {
    const currentYear = new Date().getFullYear().toString();
    const unsubscribes = [];

    try {
      setLoading(true);

      // Determine which NGO ID to use based on user type and role
      let ngoId;

      if (userDataFromFirestore.type === "ngo") {
        if (userDataFromFirestore.role === "admin") {
          // For NGO admin, use their own ID
          ngoId = auth.currentUser.uid;
        } else if (userDataFromFirestore.role === "member") {
          // For NGO member, use the ngoId from their user data
          ngoId = userDataFromFirestore.ngoId;
        }
      } else {
        // For other user types, use their own ID (fallback)
        ngoId = auth.currentUser.uid;
      }

      if (!ngoId) {
        console.log("No NGO ID found");
        setLoading(false);
        return;
      }

      console.log(
        "Setting up real-time listeners for all donations for NGO:",
        ngoId
      );

      // Define donation types to listen for
      const donationTypes = ["cash", "online", "crypto"];
      let allDonationsData = [];
      let cashDonationsArray = [];
      let onlineDonationsArray = [];
      let cryptoDonationsArray = [];

      // Set up listeners for each donation type
      donationTypes.forEach((type) => {
        const unsubscribe = onSnapshot(
          collectionGroup(db, type),
          (snapshot) => {
            let typeDonations = [];

            snapshot.forEach((doc) => {
              // Include donations that belong to this NGO (any year)
              const path = doc.ref.path;
              if (path.includes(`donations/${ngoId}`)) {
                const donationData = {
                  id: doc.id,
                  ...doc.data(),
                  paymentMethod: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize first letter
                };

                // Ensure donation has a date
                donationData.donationDate = extractDonationDate(donationData);

                // Handle crypto amounts differently - preserve original value
                if (type === "crypto") {
                  // Store original crypto amount in a separate field
                  donationData.rawCryptoAmount = donationData.cryptoAmount;
                  
                  // Set amount for calculations but keep the original value
                  if (!donationData.amount) {
                    // Only convert to Number for calculation purposes
                    donationData.amount = Number(donationData.cryptoAmount || 0);
                    // Make sure we keep the crypto type information
                    donationData.cryptoType = donationData.cryptoType || "NGC";
                  }
                }

                typeDonations.push(donationData);
              }
            });

            console.log(`Real-time ${type} Donations Data:`, typeDonations.length);

            // Update type-specific donations array
            if (type === "cash") {
              cashDonationsArray = typeDonations;
            } else if (type === "online") {
              onlineDonationsArray = typeDonations;
            } else if (type === "crypto") {
              cryptoDonationsArray = typeDonations;
            }

            // Combine all donations
            allDonationsData = [...cashDonationsArray, ...onlineDonationsArray, ...cryptoDonationsArray];

            // Calculate total amounts
            const totalDonated = allDonationsData.reduce(
              (sum, donation) => sum + Number(donation.amount || 0),
              0
            );

            const cashDonated = cashDonationsArray.reduce(
              (sum, donation) => sum + Number(donation.amount || 0),
              0
            );

            const onlineDonated = onlineDonationsArray.reduce(
              (sum, donation) => sum + Number(donation.amount || 0),
              0
            );

            const cryptoDonated = cryptoDonationsArray.reduce(
              (sum, donation) => sum + Number(donation.amount || 0),
              0
            );

            // Update donation stats with new data
            setDonationStats({
              totalDonated,
              cashDonated,
              onlineDonated,
              cryptoDonated,
              allDonations: allDonationsData,
              cashDonations: cashDonationsArray,
              onlineDonations: onlineDonationsArray,
              cryptoDonations: cryptoDonationsArray,
            });

            setLoading(false);
          },
          (error) => {
            console.error(`Error in ${type} real-time listener:`, error);
            setLoading(false);
          }
        );

        unsubscribes.push(unsubscribe);
      });
    } catch (error) {
      console.error("Error setting up real-time listeners:", error);
      setLoading(false);
    }

    // Clean up the listeners when the component unmounts
    return () => {
      unsubscribes.forEach((unsubscribe) => {
        if (unsubscribe) {
          console.log("Unsubscribing from real-time listener");
          unsubscribe();
        }
      });
    };
  };

  // Extract donation date from various possible fields
  const extractDonationDate = (donation) => {
    // Try different date fields in order of preference
    if (donation.donatedOn) {
      return donation.donatedOn;
    } else if (donation.timestamp) {
      // Handle timestamp as string or Date object
      if (donation.timestamp instanceof Date) {
        return donation.timestamp.toISOString().split("T")[0];
      } else if (typeof donation.timestamp === "string") {
        // Try to parse as ISO date first
        try {
          return donation.timestamp.includes("T")
            ? donation.timestamp.split("T")[0]
            : donation.timestamp;
        } catch (e) {
          // If not ISO format, might be a locale string or other format
          try {
            return new Date(donation.timestamp).toISOString().split("T")[0];
          } catch (e2) {
            console.warn("Could not parse timestamp:", donation.timestamp);
            return null;
          }
        }
      }
    } else if (donation.createdAt) {
      // Handle createdAt field if it exists
      if (donation.createdAt instanceof Date) {
        return donation.createdAt.toISOString().split("T")[0];
      } else if (typeof donation.createdAt === "string") {
        try {
          return donation.createdAt.includes("T")
            ? donation.createdAt.split("T")[0]
            : donation.createdAt;
        } catch (e) {
          return new Date(donation.createdAt).toISOString().split("T")[0];
        }
      }
    }

    // If no date field found, use current date
    console.warn("No date field found for donation:", donation.id);
    return new Date().toISOString().split("T")[0];
  };

  // Get donations based on the current view mode
  const getDonationsForCurrentView = () => {
    switch (viewMode) {
      case "cash":
        return donationStats.cashDonations;
      case "online":
        return donationStats.onlineDonations;
      case "crypto":
        return donationStats.cryptoDonations;
      default:
        return donationStats.allDonations;
    }
  };

  // Get date range based on selected timeframe
  const getDateRange = () => {
    const now = new Date();
    
    switch (timeFrame) {
      case "day":
        return {
          start: new Date(selectedDay.setHours(0, 0, 0, 0)),
          end: new Date(selectedDay.setHours(23, 59, 59, 999)),
          groupBy: "hour",
        };
      
      case "week":
        if (selectedWeek === "thisWeek") {
          return {
            start: startOfWeek(now),
            end: endOfWeek(now),
            groupBy: "day",
          };
        } else {
          const lastWeekStart = subWeeks(startOfWeek(now), 1);
          return {
            start: lastWeekStart,
            end: endOfWeek(lastWeekStart),
            groupBy: "day",
          };
        }
      
      case "month":
        if (selectedMonth === "thisMonth") {
          return {
            start: startOfMonth(now),
            end: endOfMonth(now),
            groupBy: "day",
          };
        } else {
          const lastMonthStart = subMonths(startOfMonth(now), 1);
          return {
            start: lastMonthStart,
            end: endOfMonth(lastMonthStart),
            groupBy: "day",
          };
        }
      
      case "year":
        const yearStart = new Date(selectedYear, 0, 1);
        return {
          start: startOfYear(yearStart),
          end: endOfYear(yearStart),
          groupBy: "month",
        };
      
      case "custom":
        if (dateRange.from && dateRange.to) {
          // Determine groupBy based on the range size
          const days = differenceInDays(dateRange.to, dateRange.from);
          let groupBy = "day";
          
          if (days > 90) {
            groupBy = "month";
          } else if (days > 31) {
            groupBy = "week";
          }
          
          return {
            start: new Date(dateRange.from.setHours(0, 0, 0, 0)),
            end: new Date(dateRange.to.setHours(23, 59, 59, 999)),
            groupBy,
          };
        }
        
        // Default to this week if custom range is not properly set
        return {
          start: startOfWeek(now),
          end: endOfWeek(now),
          groupBy: "day",
        };
      
      default:
        return {
          start: startOfWeek(now),
          end: endOfWeek(now),
          groupBy: "day",
        };
    }
  };

  // Update chart data based on current selections
  const updateChartData = () => {
    if (loading) return;
    
    const { start, end, groupBy } = getDateRange();
    const donations = getDonationsForCurrentView();
    
    // Filter donations to the selected date range
    const filteredDonations = donations.filter(donation => {
      const donationDate = new Date(donation.donationDate);
      return donationDate >= start && donationDate <= end;
    });
    
    let newChartData = [];
    
    switch (groupBy) {
      case "hour":
        // Group by hour for a single day view
        newChartData = Array.from({ length: 24 }, (_, hour) => {
          const hourDonations = filteredDonations.filter(donation => {
            const donationDate = new Date(donation.donationDate);
            return donationDate.getHours() === hour;
          });
          
          const total = hourDonations.reduce(
            (sum, donation) => sum + Number(donation.amount || 0),
            0
          );
          
          return {
            name: `${hour}:00`,
            date: new Date(start.getFullYear(), start.getMonth(), start.getDate(), hour).toISOString(),
            total,
          };
        });
        break;
        
      case "day":
        // Group by day
        const dayInterval = eachDayOfInterval({ start, end });
        newChartData = dayInterval.map(date => {
          const dayDonations = filteredDonations.filter(donation => {
            const donationDate = new Date(donation.donationDate);
            return isSameDay(donationDate, date);
          });
          
          const total = dayDonations.reduce(
            (sum, donation) => sum + Number(donation.amount || 0),
            0
          );
          
          return {
            name: format(date, "MMM dd"),
            date: date.toISOString(),
            total,
          };
        });
        break;
        
      case "week":
        // Group by week
        const weekInterval = eachWeekOfInterval({ start, end });
        newChartData = weekInterval.map((date, index) => {
          const weekStart = date;
          const weekEnd = index < weekInterval.length - 1 
            ? new Date(weekInterval[index + 1].getTime() - 1) 
            : end;
          
          const weekDonations = filteredDonations.filter(donation => {
            const donationDate = new Date(donation.donationDate);
            return donationDate >= weekStart && donationDate <= weekEnd;
          });
          
          const total = weekDonations.reduce(
            (sum, donation) => sum + Number(donation.amount || 0),
            0
          );
          
          return {
            name: `Week ${index + 1}`,
            date: date.toISOString(),
            total,
          };
        });
        break;
        
      case "month":
        // Group by month
        const monthInterval = eachMonthOfInterval({ start, end });
        newChartData = monthInterval.map(date => {
          const monthDonations = filteredDonations.filter(donation => {
            const donationDate = new Date(donation.donationDate);
            return (
              isSameMonth(donationDate, date) && 
              getYear(donationDate) === getYear(date)
            );
          });
          
          const total = monthDonations.reduce(
            (sum, donation) => sum + Number(donation.amount || 0),
            0
          );
          
          return {
            name: format(date, "MMM yyyy"),
            date: date.toISOString(),
            total,
          };
        });
        break;
    }
    
    setChartData(newChartData);
  };

  // Handle radio button change for view mode
  const handleViewModeChange = (value) => {
    setViewMode(value);
  };

  // Handle tab change for time frame
  const handleTimeFrameChange = (value) => {
    setTimeFrame(value);
  };

  // Handle change for specific day
  const handleDayChange = (day) => {
    setSelectedDay(day);
  };

  // Handle radio button change for week selection
  const handleWeekChange = (value) => {
    setSelectedWeek(value);
  };

  // Handle radio button change for month selection
  const handleMonthChange = (value) => {
    setSelectedMonth(value);
  };

  // Handle select change for year
  const handleYearChange = (value) => {
    setSelectedYear(parseInt(value));
  };

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  // Handle chart type change
  const handleChartTypeChange = (value) => {
    setChartType(value);
  };

  // Function to render the appropriate chart type
  const renderChart = () => {
    if (chartType === "bar") {
      return (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip
            formatter={(value) => [
              `₹${value.toLocaleString()}`,
              "Amount",
            ]}
          />
          <Bar dataKey="total" fill="#1CAC78" radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    } else {
      return (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip
            formatter={(value) => [
              `₹${value.toLocaleString()}`,
              "Amount",
            ]}
          />
          <Line 
            type="monotone" 
            dataKey="total" 
            stroke="#1CAC78" 
            strokeWidth={2} 
            dot={{ r: 4 }}
          />
        </LineChart>
      );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Stats Cards */}
      <div className="md:col-span-3 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Donations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading
                ? "Loading..."
                : `₹${donationStats.totalDonated.toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined cash and online donations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cash Donations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading
                ? "Loading..."
                : `₹${donationStats.cashDonated.toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Total cash donations received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Online Donations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading
                ? "Loading..."
                : `₹${donationStats.onlineDonated.toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Total online donations received
            </p>
          </CardContent>
        </Card>
        
        {donationStats.cryptoDonated > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Crypto Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading
                  ? "Loading..."
                  : `₹${donationStats.cryptoDonated.toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Total cryptocurrency donations
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Donations Chart */}
      <div className="md:col-span-9">
        <Card>
          <CardHeader className="flex flex-col space-y-4">
            <div className="flex flex-row items-center justify-between">
              <CardTitle>Donation Analytics</CardTitle>
              <Select value={chartType} onValueChange={handleChartTypeChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Chart Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={timeFrame} onValueChange={handleTimeFrameChange} className="w-full">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>
              
              <TabsContent value="day" className="mt-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm">Select Day:</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        {selectedDay ? format(selectedDay, "PP") : "Select date"}
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDay}
                        onSelect={handleDayChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </TabsContent>
              
              <TabsContent value="week" className="mt-4">
                <div className="flex justify-end">
              <RadioGroup
                defaultValue="thisWeek"
                className="flex flex-row space-x-4"
                value={selectedWeek}
                onValueChange={handleWeekChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="thisWeek" id="thisWeek" />
                  <Label htmlFor="thisWeek">This Week</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lastWeek" id="lastWeek" />
                  <Label htmlFor="lastWeek">Last Week</Label>
                </div>
              </RadioGroup>
            </div>
              </TabsContent>
              
              <TabsContent value="month" className="mt-4">
                <div className="flex justify-end">
                  <RadioGroup
                    defaultValue="thisMonth"
                    className="flex flex-row space-x-4"
                    value={selectedMonth}
                    onValueChange={handleMonthChange}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="thisMonth" id="thisMonth" />
                      <Label htmlFor="thisMonth">This Month</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="lastMonth" id="lastMonth" />
                      <Label htmlFor="lastMonth">Last Month</Label>
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>
              
              <TabsContent value="year" className="mt-4">
            <div className="flex justify-end">
                  <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => (
                        <SelectItem 
                          key={new Date().getFullYear() - i} 
                          value={(new Date().getFullYear() - i).toString()}
                        >
                          {new Date().getFullYear() - i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              
              <TabsContent value="custom" className="mt-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm">Select Date Range:</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "PP")} -{" "}
                              {format(dateRange.to, "PP")}
                            </>
                          ) : (
                            format(dateRange.from, "PP")
                          )
                        ) : (
                          "Select dates"
                        )}
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={handleDateRangeChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end mt-4">
              <RadioGroup
                defaultValue="all"
                className="flex flex-row space-x-4"
                value={viewMode}
                onValueChange={handleViewModeChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">All</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash">Cash</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online">Online</Label>
                </div>
                {donationStats.cryptoDonations?.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="crypto" id="crypto" />
                    <Label htmlFor="crypto">Crypto</Label>
                  </div>
                )}
              </RadioGroup>
            </div>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DonationsDashboard;
