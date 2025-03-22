"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BellIcon,
  CalendarIcon,
  DollarSignIcon,
  UsersIcon,
  Globe,
  IndianRupee,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { TranslationModal } from "@/components/TranslationModal";
import NGORecommendation from "@/components/NGORecommendation"; // Import the new component

export default function UserDashboardPage() {
  const user = auth.currentUser;
  const [userData, setUserData] = useState(null);
  const [participations, setParticipations] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const { language, translations } = useLanguage();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;

      try {
        // Fetch user profile data
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          setUserData(userDoc.data());
          console.log("User Data:", userDoc.data());
          // Fetch participations data
          if (
            userDoc.data().participations &&
            userDoc.data().participations.length > 0
          ) {
            const participationsWithDetails = await Promise.all(
              userDoc.data().participations.map(async (participation) => {
                const eventDoc = await getDoc(
                  doc(db, "activities", participation.activityId)
                );
                return {
                  ...participation,
                  eventDetails: eventDoc.exists() ? eventDoc.data() : null,
                  eventDate: new Date(eventDoc.data().eventDate), // Convert eventDate to Date object
                };
              })
            );
            setParticipations(participationsWithDetails);
          }

          // Fetch donations data
          const donationsSnapshot = await getDocs(
            query(
              collection(db, "users", user.uid, "donatedTo"),
              orderBy("timestamp", "desc"),
              limit(5)
            )
          );

          const donationsData = await Promise.all(
            donationsSnapshot.docs.map(async (donationDoc) => {
              const ngoDoc = await getDoc(doc(db, "ngo", donationDoc.id));
              return {
                id: donationDoc.id,
                ...donationDoc.data(),
                ngoDetails: ngoDoc.exists() ? ngoDoc.data() : null,
                timestamp: new Date(donationDoc.data().timestamp), // Convert timestamp to Date object
              };
            })
          );

          setDonations(donationsData);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const attendedActivities = participations.filter(
    (participation) => participation.attendance === true
  );

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"
            role="status"
          >
            <span className="sr-only">{translations.loading || "Loading..."}</span>
          </div>
          <p className="mt-2 text-gray-600">{translations.loading_dashboard || "Loading your dashboard..."}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4 space-y-8"
    >
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{translations.my_dashboard || "My Dashboard"}</h1>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => setShowTranslationModal(true)}
        >
          <Globe className="h-4 w-4" />
          <span>{translations.translate || "Translate"}</span>
        </Button>
      </div>

      {/* Personal Overview */}
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle>{translations.personal_overview || "Personal Overview"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={userData?.photoURL} alt={userData?.name} />
              <AvatarFallback>
                {userData?.name?.charAt(0) || user?.email?.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2 flex-1">
              <h2 className="text-2xl font-semibold">
                {userData?.name || translations.anonymous_volunteer || "Anonymous Volunteer"}
              </h2>
              <p className="text-gray-500">{user?.email}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3">
                  <IndianRupee className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">{translations.total_donated || "Total Donated"}</p>
                    <p className="text-xl font-bold">
                      ₹{userData?.totalDonated || 0}
                    </p>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg flex items-center gap-3">
                  <CalendarIcon className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">{translations.events_participated || "Events Participated"}</p>
                    <p className="text-xl font-bold">
                      {userData?.participations?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Volunteer Activities Section */}
        <div className="lg:col-span-2">
          <Card className="shadow-md h-full">
            <CardHeader className="pb-2">
              <CardTitle>{translations.participation_activities || "Participation Activities"}</CardTitle>
            </CardHeader>
            <CardContent>
              {attendedActivities.length > 0 ? (
                <div className="space-y-4">
                  {attendedActivities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="bg-green-100 p-2 rounded-full">
                        <UsersIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">
                          {activity.eventDetails?.eventName || translations.event_name || "Event Name"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {activity.eventDate
                            ? activity.eventDate.toLocaleDateString()
                            : translations.date_not_available || "Date not available"}
                        </p>
                        <p className="text-sm mt-1">
                          {activity.eventDetails?.shortDescription?.substring(
                            0,
                            100
                          )}
                          ...
                        </p>
                      </div>
                      <Badge className="bg-green-500">{translations.participant || "Participant"}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UsersIcon className="h-12 w-12 mx-auto text-gray-300" />
                  <h3 className="mt-2 text-xl font-medium text-gray-600">
                    {translations.no_activities_yet || "No activities yet"}
                  </h3>
                  <p className="mt-1 text-gray-500">
                    {translations.join_event_message || "Join an event to start your volunteering journey"}
                  </p>
                  <Button className="mt-4">{translations.find_opportunities || "Find Opportunities"}</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Panel */}
        <div>
          <Card className="shadow-md h-full">
            <CardHeader className="pb-2">
              <CardTitle>{translations.quick_actions || "Quick Actions"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                <Link
                  href="/dashboard/user/search-activity"
                  className="w-full flex items-center justify-center gap-2 bg-black text-white p-2 rounded-lg"
                  size="lg"
                >
                  <CalendarIcon className="h-5 w-5" />
                  <span>{translations.browse_events || "Browse Events"}</span>
                </Link>
                <Link
                  href="/ngo"
                  className="w-full flex items-center justify-center gap-2 bg-black text-white p-2 rounded-lg"
                  size="lg"
                  variant="outline"
                >
                  <DollarSignIcon className="h-5 w-5" />
                  <span>{translations.make_donation || "Make a Donation"}</span>
                </Link>

                <Link
                  href="/dashboard/user/donations"
                  className="w-full flex items-center justify-center gap-2 bg-black text-white p-2 rounded-lg"
                >
                  <IndianRupee className="h-5 w-5" />
                  <span>{translations.view_donations || "View Your Donations"}</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Donations */}
        <div className="lg:col-span-2">
          <Card className="shadow-md h-full">
            <CardHeader className="pb-2">
              <CardTitle>{translations.recent_donations || "Recent Donations"}</CardTitle>
            </CardHeader>
            <CardContent>
              {donations.length > 0 ? (
                <div className="space-y-4">
                  {donations.map((donation, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <Avatar>
                        <AvatarImage src={donation.ngoDetails?.photoURL} />
                        <AvatarFallback>
                          {donation.ngoDetails?.ngoName?.charAt(0) || "N"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-medium">
                          {donation.ngoDetails?.ngoName || translations.organization_name || "Organization Name"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {donation.timestamp
                            ? donation.timestamp.toLocaleDateString()
                            : translations.date_not_available || "Date not available"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          ₹ {donation.amount}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {donation.campaign || translations.general || "General"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSignIcon className="h-12 w-12 mx-auto text-gray-300" />
                  <h3 className="mt-2 text-xl font-medium text-gray-600">
                    {translations.no_donations_yet || "No donations yet"}
                  </h3>
                  <p className="mt-1 text-gray-500">
                    {translations.make_donation_message || "Make a donation to support a cause you care about"}
                  </p>
                  <Button className="mt-4">{translations.donate_now || "Donate Now"}</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* NGO Recommendation Section - New Addition */}
      <NGORecommendation userData={userData} />

      {/* Translation Modal */}
      <TranslationModal 
        isOpen={showTranslationModal} 
        onClose={() => setShowTranslationModal(false)} 
      />
    </motion.div>
  );
}