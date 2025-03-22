"use client";

import React, { useEffect, useState } from "react";
import { Calendar, MapPin, Download, Maximize2, Globe } from "lucide-react";
import { useQRCode } from "next-qrcode";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useLanguage } from "@/context/LanguageContext";
import { TranslationModal } from "@/components/TranslationModal";

// Card components
const Card = ({ children, className = "" }) => (
  <div
    className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}
  >
    {children}
  </div>
);

const CardHeader = ({ children }) => (
  <div className="flex flex-col space-y-1.5 p-6">{children}</div>
);

const CardTitle = ({ children, className = "" }) => (
  <h3
    className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
  >
    {children}
  </h3>
);

const CardContent = ({ children }) => (
  <div className="p-6 pt-0">{children}</div>
);

// Button component
const Button = ({
  children,
  className = "",
  variant = "default",
  size = "default",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors";
  const variantStyles = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline:
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    destructive:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  };
  const sizeStyles = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Badge component with custom colors
const Badge = ({ children, variant = "default", className = "" }) => {
  const baseStyles =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors";

  // Custom styles based on content
  let customStyle = "";
  switch (children) {
    case "participant":
      customStyle = "bg-blue-100 text-blue-800";
      break;
    case "Coordinator":
      customStyle = "bg-purple-100 text-purple-800";
      break;
    case "Ongoing":
      customStyle = "bg-green-100 text-green-800";
      break;
    case "Upcoming":
      customStyle = "bg-yellow-100 text-yellow-800";
      break;
    case "Attended":
      customStyle = "bg-green-100 text-green-800";
      break;
    case "Not Attended":
      customStyle = "bg-red-100 text-red-800";
      break;
    default:
      customStyle = "bg-gray-100 text-gray-800";
  }

  return (
    <span className={`${baseStyles} ${customStyle} ${className}`}>
      {children}
    </span>
  );
};

const ActivityParticipationPage = () => {
  const router = useRouter();
  const { language, translations } = useLanguage();
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  
  const handleRedirect = () => {
    router.push("/dashboard/user/activities/search-activity");
  };
  const [liveEvent, setLiveEvent] = useState(null);
  const [upcomingActivities, setUpcomingActivities] = useState([]);
  const [attendedActivities, setAttendedActivities] = useState([]);
  const [notAttendedActivities, setNotAttendedActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQRCode, setExpandedQRCode] = useState(null);
  const [expandedQRTitle, setExpandedQRTitle] = useState("");
  const [showCertificate, setShowCertificate] = useState(false);
  const [certificateData, setCertificateData] = useState(null);
  const [userName, setUserName] = useState("");
  const { Canvas } = useQRCode();

  // Function to show expanded QR code dialog
  const showExpandedQR = (qrData, activityName) => {
    setExpandedQRCode(qrData);
    setExpandedQRTitle(activityName);
  };

  // Function to close expanded QR code dialog
  const closeExpandedQR = () => {
    setExpandedQRCode(null);
    setExpandedQRTitle("");
  };

  // Function to close certificate dialog
  const closeCertificate = () => {
    setShowCertificate(false);
    setCertificateData(null);
  };

  // Function to extract timestamp from activity ID
  const getEventTimestamp = (activityId) => {
    if (!activityId) return 0;
    const parts = activityId.split("_");
    if (parts.length > 1) {
      return parseInt(parts[1]);
    }
    return 0;
  };

  // Function to format date in a readable format
  const formatDateLong = (dateString) => {
    if (!dateString) return translations.no_date || "No date";
    const date = new Date(dateString);
    
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    return date.toLocaleDateString('en-US', options);
  };

  // Function to get user data
  const getUserData = async () => {
    try {
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) {
        throw new Error(translations.user_not_authenticated || "User not authenticated");
      }

      const userDoc = await getDoc(doc(db, "users", currentUserId));
      if (!userDoc.exists()) {
        throw new Error(translations.user_data_not_found || "User data not found");
      }

      const userData = userDoc.data();
      setUserName(userData.name || "");
      return userData;
    } catch (err) {
      console.error("Error getting user data:", err);
      return null;
    }
  };

  // Function to generate certificate
  const generateCertificate = async (activity) => {
    setLoading(true);
    try {
      // Get user data
      const userData = await getUserData();
      if (!userData) {
        throw new Error(translations.could_not_retrieve_user_data || "Could not retrieve user data");
      }

      // Get NGO data for signature
      const ngoDoc = await getDoc(doc(db, "ngo", activity.ngoId));
      const ngoData = ngoDoc.exists() ? ngoDoc.data() : { ngoName: translations.organization || "Organization" };

      // Set certificate data
      setCertificateData({
        userName: userData.name || translations.participant || "Participant",
        userEmail: userData.email || "",
        eventName: activity.activityDetails?.eventName || translations.event || "Event",
        eventDate: formatDateLong(activity.activityDetails?.eventDate),
        eventLocation: activity.activityDetails?.location?.address || translations.location || "Location",
        ngoName: ngoData.ngoName,
        ngoSignature: ngoData.signatureUrl || "/signature-placeholder.png",
        role: activity.role || "participant",
        issuedDate: formatDateLong(new Date()),
      });

      setShowCertificate(true);
    } catch (err) {
      console.error("Error generating certificate:", err);
      setError(translations.failed_to_generate_certificate || "Failed to generate certificate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to download certificate as PDF
  const downloadCertificate = async () => {
    const certificateElement = document.getElementById("certificate-container");
    
    if (!certificateElement) return;
    
    try {
      const canvas = await html2canvas(certificateElement, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificate_${certificateData.eventName.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Error downloading certificate:", err);
      setError(translations.failed_to_download_certificate || "Failed to download certificate. Please try again.");
    }
  };

  // Mark attendance for live event
  const markAttendance = () => {
    // Add logic to mark attendance
    setLiveEvent(null);
  };

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Get current user ID
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) {
          throw new Error(translations.user_not_authenticated || "User not authenticated");
        }

        // Get user's participation data
        const userDoc = await getDoc(doc(db, "users", currentUserId));
        if (!userDoc.exists()) {
          throw new Error(translations.user_data_not_found || "User data not found");
        }

        const userData = userDoc.data();
        setUserName(userData.name || "");
        const participationsArray = userData.participations || [];

        // Current date for filtering
        const currentDate = new Date();

        // Arrays to store activities
        const upcoming = [];
        const attended = [];
        const notAttended = [];
        let closest = null;
        let closestDiff = Infinity;
        let currentActivity = null;

        // Fetch full details for each participating activity
        const activitiesWithDetails = await Promise.all(
          participationsArray.map(async (participation) => {
            // Get activity details
            const activityDoc = await getDoc(
              doc(db, "activities", participation.activityId)
            );
            if (!activityDoc.exists()) return null;

            const activityData = activityDoc.data();

            // Get NGO details
            const ngoDoc = await getDoc(doc(db, "ngo", participation.ngoId));
            const ngoName = ngoDoc.exists()
              ? ngoDoc.data().ngoName
              : translations.unknown_ngo || "Unknown NGO";

            // Create QR code data
            const qrData = JSON.stringify({
              activityId: participation.activityId,
              participationId: currentUserId,
              sId: participation.sId,
              ngoId: participation.ngoId,
              timestamp: new Date().toISOString(),
            });

            // Get event date (convert from string to Date if needed)
            const eventDate = activityData.eventDate
              ? new Date(activityData.eventDate)
              : null;
            const timestamp = getEventTimestamp(participation.activityId);

            return {
              ...participation,
              activityDetails: activityData,
              ngoName: ngoName,
              qrData: qrData,
              eventDate: eventDate,
              timestamp: timestamp,
              role: participation.role || "participant", // Default role
              attendance: participation.attendance || false, // Add attendance property
            };
          })
        );

        // Filter out null entries and categorize activities
        const validActivities = activitiesWithDetails.filter(
          (activity) => activity !== null
        );

        validActivities.forEach((activity) => {
          if (activity.eventDate) {
            // Check if activity is happening now (current date is on the same day as event date)
            const isToday =
              activity.eventDate.toDateString() === currentDate.toDateString();

            // If activity is today, mark as current
            if (isToday) {
              currentActivity = activity;
            }

            // If attendance is true, add to attended activities
            if (activity.attendance) {
              attended.push(activity);
            }
            // If event date is in the future and attendance is false, add to upcoming
            else if (activity.eventDate > currentDate) {
              upcoming.push(activity);

              // Check if this is the closest upcoming event
              const timeDiff = activity.eventDate - currentDate;
              if (timeDiff < closestDiff) {
                closestDiff = timeDiff;
                closest = activity;
              }
            }
            // If event date is in the past, attendance is false, and not today, add to not attended
            else if (
              activity.eventDate < currentDate &&
              !isToday &&
              !activity.attendance
            ) {
              notAttended.push(activity);
            }
          } else {
            // If no date, use timestamp to determine if it's past
            const activityTimestamp = activity.timestamp;

            if (activity.attendance) {
              attended.push(activity);
            } else if (activityTimestamp < Date.now()) {
              notAttended.push(activity);
            } else {
              upcoming.push(activity);
            }
          }
        });

        // Sort upcoming events by date (closest first)
        upcoming.sort((a, b) => {
          if (a.eventDate && b.eventDate) {
            return a.eventDate - b.eventDate;
          }
          return 0;
        });

        // Sort past activities by date (most recent first)
        attended.sort((a, b) => {
          if (a.eventDate && b.eventDate) {
            return b.eventDate - a.eventDate;
          }
          // Or use timestamp if available
          return b.timestamp - a.timestamp;
        });

        notAttended.sort((a, b) => {
          if (a.eventDate && b.eventDate) {
            return b.eventDate - a.eventDate;
          }
          return b.timestamp - a.timestamp;
        });

        // Set the live event if there is one, otherwise use the closest upcoming event
        setLiveEvent(currentActivity);
        setUpcomingActivities(upcoming);
        setAttendedActivities(attended);
        setNotAttendedActivities(notAttended);
      } catch (err) {
        console.error("Error fetching activities:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [translations]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return translations.no_date || "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Render Activity Item
  const renderActivityItem = (
    activity,
    index,
    showQR = false,
    showCertificateButton = false
  ) => (
    <div
      key={activity.activityId || index}
      className={`flex items-center justify-between ${
        showQR ? "border p-3 pb-4" : "border-b pb-4"
      }`}
    >
      <div className={showQR ? "flex gap-4 h-full" : ""}>
        {showQR && (
          <Image
            src={activity.activityDetails?.logoUrl || "/placeholder.svg"}
            alt={activity.activityDetails?.eventName || translations.activity || "Activity"}
            className="object-cover"
            width={200}
            height={200}
          />
        )}
        <div className="flex flex-col justify-center">
          <h3 className={`font-semibold ${showQR ? "text-2xl" : ""}`}>
            {activity.activityDetails?.eventName}
          </h3>
          <p className={`${showQR ? "text-md" : "text-sm"} text-gray-500`}>
            {activity.ngoName}
          </p>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(activity.activityDetails?.eventDate)}</span>
            <MapPin className="w-4 h-4 ml-2" />
            <span>{activity.activityDetails?.location?.address}</span>
          </div>
          <div className="mt-2 flex gap-2">
            <Badge>{activity.role}</Badge>
            {!showQR && (
              <Badge>{activity.attendance ? translations.attended || "Attended" : translations.not_attended || "Not Attended"}</Badge>
            )}
          </div>
        </div>
      </div>
      {showQR ? (
        <div className="p-4 bg-gray-50 flex flex-col items-center justify-center min-w-[160px]">
          <p className="text-xs text-gray-500 mb-2">{translations.show_qr_at_event || "Show QR at event"}</p>
          <Canvas
            text={activity.qrData}
            options={{
              errorCorrectionLevel: "M",
              margin: 3,
              scale: 4,
              width: 120,
              color: {
                dark: "#1CAC78",
                light: "#FFFFFF",
              },
            }}
          />
          <div className="flex mt-3 space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center text-xs"
              onClick={() =>
                showExpandedQR(
                  activity.qrData,
                  activity.activityDetails?.eventName
                )
              }
            >
              <Maximize2 className="w-3 h-3 mr-1" />
              {translations.expand || "Expand"}
            </Button>
          </div>
        </div>
      ) : (
        showCertificateButton && (
          <div className="text-right">
            <Button 
              variant="sm" 
              size="sm" 
              className="bg-[#1CAC78] hover:bg-green-500 text-white"
              onClick={() => generateCertificate(activity)}
            >
              <Download className="w-4 h-4 mr-2" />
              {translations.certificate || "Certificate"}
            </Button>
          </div>
        )
      )}
    </div>
  );
  
  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{translations.activity_participation || "Activity Participation"}</h1>
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
        <div className="container mx-auto p-4 flex items-center justify-center">
          <div className="text-center">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"
              role="status"
            >
              <span className="sr-only">{translations.loading || "Loading..."}</span>
            </div>
            <p className="mt-2 text-gray-600">{translations.loading_activities || "Loading your activities..."}</p>
          </div>
        </div>
      ) : error ? (
        <p className="text-red-500">{translations.error || "Error"}: {error}</p>
      ) : (
        <>
          {liveEvent && (
            <Card className="bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-700">{translations.live_event || "Live Event"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {liveEvent.activityDetails?.eventName}
                    </h3>
                    <p className="text-sm text-gray-500">{liveEvent.ngoName}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>{liveEvent.activityDetails?.location}</span>
                    </div>
                  </div>
                  <Button
                    onClick={markAttendance}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {translations.mark_attendance || "Mark Attendance"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{translations.upcoming_events || "Upcoming Events"}</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingActivities.length > 0 ? (
                <div className="space-y-4">
                  {upcomingActivities.map((activity, index) =>
                    renderActivityItem(activity, index, true)
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  {translations.no_upcoming_events || "No upcoming events found"}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{translations.past_events || "Past Events"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="attended" className="w-full">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="attended">{translations.attended || "Attended"}</TabsTrigger>
                  <TabsTrigger value="not-attended">{translations.not_attended || "Not Attended"}</TabsTrigger>
                </TabsList>

                <TabsContent value="attended">
                  {attendedActivities.length > 0 ? (
                    <div className="space-y-4">
                      {attendedActivities.map((activity, index) =>
                        renderActivityItem(activity, index, false, true)
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500">
                      {translations.no_attended_events || "No attended events found"}
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="not-attended">
                  {notAttendedActivities.length > 0 ? (
                    <div className="space-y-4">
                      {notAttendedActivities.map((activity, index) =>
                        renderActivityItem(activity, index, false, false)
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500">
                      {translations.no_missed_events || "No missed events found"}
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button className="bg-[#1CAC78] hover:bg-[#158f63] text-white" onClick={handleRedirect} variant="sm">
              {translations.find_more_activities || "Find More Activities!"}
            </Button>
          </div>
        </>
      )}

      {/* Expanded QR Code Alert Dialog */}
      <AlertDialog
        open={expandedQRCode !== null}
        onOpenChange={closeExpandedQR}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              {expandedQRTitle || translations.event || "Event"} {translations.qr_code || "QR Code"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {translations.present_qr_code || "Present this QR code at the event check-in"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex justify-center py-6">
            {expandedQRCode && (
              <Canvas
                text={expandedQRCode}
                options={{
                  errorCorrectionLevel: "M",
                  margin: 3,
                  scale: 8,
                  width: 250,
                  color: {
                    dark: "#1CAC78",
                    light: "#FFFFFF",
                  },
                }}
              />
            )}
          </div>

          <AlertDialogFooter className="flex-col space-y-2">
            <AlertDialogAction className="w-full">{translations.close || "Close"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Certificate Alert Dialog */}
      <AlertDialog
        open={showCertificate}
        onOpenChange={closeCertificate}
      >
        <AlertDialogContent className="max-w-4xl p-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              {translations.certificate_of_appreciation || "Certificate of Appreciation"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {translations.thank_you_participation || "Thank you for your participation!"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {certificateData && (
            <div id="certificate-container" className="p-6 border-4 border-[#1CAC78] rounded-lg bg-white">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-[#1CAC78]">{translations.certificate_of_appreciation || "Certificate of Appreciation"}</h1>
                <div className="mt-2 text-gray-600">
                  {translations.this_is_to_certify || "This is to certify that"}
                </div>
                <h2 className="text-3xl font-bold mt-4 text-gray-800">{certificateData.userName}</h2>
                <p className="text-gray-600 mt-1">{certificateData.userEmail}</p>
                
                <div className="my-8 text-gray-700 text-lg">
                  <p>{translations.has_participated || "has successfully participated in"}</p>
                  <h3 className="text-2xl font-bold mt-2 text-gray-800">{certificateData.eventName}</h3>
                  <p className="mt-2">
                    {translations.as_a || "as a"} <span className="font-semibold">{certificateData.role}</span>
                  </p>
                  <p className="mt-2">
                    {translations.on || "on"} {certificateData.eventDate} {translations.at || "at"} {certificateData.eventLocation}
                  </p>
                </div>
                
                <div className="flex justify-center mt-10">
                  <div className="text-center">
                    <div className="h-12 border-b border-gray-400 w-48 flex justify-center items-end">
                      
                    </div>
                    <p className="mt-2 text-gray-600">{translations.for || "For"} {certificateData.ngoName}</p>
                  </div>
                </div>
                
                <div className="mt-8 text-gray-500 text-sm">
                  <p>{translations.issued_on || "Issued on"}: {certificateData.issuedDate}</p>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter className="flex-col space-y-2 mt-4">
            <Button
              className="w-full bg-[#1CAC78] hover:bg-[#158f63] text-white mt-2"
              onClick={downloadCertificate}
            >
              <Download className="w-4 h-4 mr-2" />
              {translations.download_certificate || "Download Certificate"}
            </Button>
            <AlertDialogAction className="w-full h-10">{translations.close || "Close"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Translation Modal */}
      <TranslationModal 
        isOpen={showTranslationModal} 
        onClose={() => setShowTranslationModal(false)} 
      />
    </div>
  );
};

export default ActivityParticipationPage;