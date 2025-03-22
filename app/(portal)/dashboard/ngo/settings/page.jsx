"use client";

import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileInformation from "@/components/profile/ngo/ProfileInformation";
import VerificationInformation from "@/components/profile/ngo/VerificationInformation";
import DonationInformation from "@/components/profile/ngo/DonationInformation";
import SecurityInformation from "@/components/profile/ngo/SecurityInformation";
import MemberProfile from "@/components/profile/ngo/MemberProfile";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { useState, useEffect, useCallback } from "react";
import { useReadContract } from "wagmi";
import { NGOABI } from "@/constants/contract";
import { formatEther } from "viem";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertCircle, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const NGOSettingsPage = () => {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [ngoProfile, setNgoProfile] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [userType, setUserType] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ngoId, setNgoId] = useState(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showEditModeDialog, setShowEditModeDialog] = useState(false);
  const [isSubmittingVerification, setIsSubmittingVerification] =
    useState(false);
  const [isSwitchingToEdit, setIsSwitchingToEdit] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showEmailVerificationAlert, setShowEmailVerificationAlert] =
    useState(false);

  const {
    data: ngoBalance,
    error: ngoBalanceError,
    isPending: ngoBalancePending,
  } = useReadContract({
    address: ngoProfile?.donationsData?.ngoOwnerAddContract || undefined,
    abi: NGOABI,
    functionName: "getAvailableBalance",
    enabled: Boolean(ngoProfile?.donationsData?.ngoOwnerAddContract),
  });

  // Effect to check user authentication and type/role - optimized with useCallback
  const fetchUserData = useCallback(
    async (currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
        // Check if email is verified
        setIsEmailVerified(currentUser.emailVerified);

        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserType(userData.type);
            setUserRole(userData.role);

            // If user is NGO member, set the NGO ID
            if (userData.type === "ngo" && userData.role === "member") {
              setNgoId(userData.ngoId);
            } else if (userData.type === "ngo" && userData.role === "admin") {
              setNgoId(currentUser.uid);

              // Fetch NGO profile data in a single request
              const ngoDocRef = doc(db, "ngo", currentUser.uid);
              const approvalDocRef = doc(db, "approvals", currentUser.uid);

              const [ngoDoc, approvalDoc] = await Promise.all([
                getDoc(ngoDocRef),
                getDoc(approvalDocRef),
              ]);

              if (ngoDoc.exists()) {
                const data = ngoDoc.data();
                setNgoProfile(data);
                setVerificationStatus(data.isVerified);
              }

              if (approvalDoc.exists()) {
                setApprovalStatus(approvalDoc.data().approval);
              } else {
                setApprovalStatus(null);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast.error("Error loading user data");
        } finally {
          setIsLoading(false);
        }
      } else {
        // No user is signed in, redirect to login
        router.replace("/login");
      }
    },
    [router]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, fetchUserData);
    return () => unsubscribe();
  }, [fetchUserData]);

  // Function to send verification email
  const sendVerificationEmail = async (ngoData) => {
    try {
      const response = await fetch("/api/ngo-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ngoName: ngoData.ngoName || "NGO",
          ngoId: userId,
          ngoEmail: ngoData.email || "No email provided",
          ngoPhone: ngoData.phone || "No phone provided",
          ngoType: ngoData.displayType || ngoData.type || "Not specified",
          adminEmail: "shindearyan179@gmail.com",
          senderEmail: "admin@aryanshinde.in",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send notification email");
      }

      return true;
    } catch (error) {
      console.error("Error sending verification email:", error);
      return false;
    }
  };

  // Function to check if all required fields are filled
  const validateProfileCompleteness = useCallback(() => {
    if (!ngoProfile) return false;

    // Required profile fields
    const requiredProfileFields = [
      "ngoName",
      "name",
      "registrationNumber",
      "description",
      "phone",
      "email",
      "type",
      "mission",
      "vision",
      "state",
      "district",
    ];

    // Check if custom type is filled when type is "Other"
    if (ngoProfile.type === "Other" && !ngoProfile.customType) {
      return false;
    }

    // Check all required fields exist and are not empty
    for (const field of requiredProfileFields) {
      if (!ngoProfile[field] || ngoProfile[field].trim() === "") {
        return false;
      }
    }

    // Check if verification documents are uploaded
    if (
      !ngoProfile.documents ||
      Object.keys(ngoProfile.documents || {}).length === 0
    ) {
      return false;
    }

    // Check if donations data is set up
    if (
      !ngoProfile.donationsData ||
      !ngoProfile.donationsData.razorpayKeyId ||
      !ngoProfile.donationsData.razorpayKeySecret
    ) {
      return false;
    }

    return true;
  }, [ngoProfile]);

  const handleVerifyProfile = async () => {
    // Check if email is verified before proceeding
    if (!isEmailVerified) {
      setShowEmailVerificationAlert(true);
      toast.error("Please verify your email before verifying your NGO profile");
      return;
    }

    // If email is verified, show verification dialog
    setShowVerificationDialog(true);
  };

  const confirmVerifyProfile = async () => {
    // Since we're only checking email verification, we'll proceed directly
    setIsSubmittingVerification(true);

    try {
      // Create a new document in approvals collection
      const approvalRef = doc(db, "approvals", `${userId}`);
      await setDoc(approvalRef, {
        ngoId: userId,
        timestamp: serverTimestamp(),
        approval: "pending",
      });

      // Update the NGO document with verification status
      const ngoRef = doc(db, "ngo", userId);
      await updateDoc(ngoRef, {
        isVerified: "pending",
      });

      // Send email to admin
      const emailSent = await sendVerificationEmail(ngoProfile);

      if (emailSent) {
        toast.success(
          "Verification request submitted successfully! Admin has been notified."
        );
      } else {
        toast.success(
          "Verification request submitted, but failed to notify admin."
        );
      }

      setShowVerificationDialog(false);

      // Update local state
      setVerificationStatus("pending");
      setApprovalStatus("pending");
    } catch (error) {
      console.error("Error submitting verification request:", error);
      toast.error("Failed to submit verification request. Please try again.");
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const handleSwitchToEditingMode = async () => {
    setShowEditModeDialog(true);
  };

  const confirmSwitchToEditingMode = async () => {
    setIsSwitchingToEdit(true);

    try {
      // Update the isVerified inside the "ngo/[ngoId]" to pending again
      const ngoRef = doc(db, "ngo", userId);
      await updateDoc(ngoRef, {
        isVerified: null,
      });

      // Update approval status
      const approvalRef = doc(db, "approvals", userId);
      await setDoc(
        approvalRef,
        {
          ngoId: userId,
          timestamp: serverTimestamp(),
          approval: null,
        },
        { merge: true }
      );

      toast.success(
        "Profile switched to editing mode. Your NGO is now unlisted from public pages."
      );

      // Update local state
      setVerificationStatus(null);
      setApprovalStatus(null);
      setShowEditModeDialog(false);
    } catch (error) {
      console.error("Error switching to editing mode:", error);
      toast.error("Failed to switch to editing mode. Please try again.");
    } finally {
      setIsSwitchingToEdit(false);
    }
  };

  // Function to resend verification email
  const handleResendVerificationEmail = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await user.sendEmailVerification();
        toast.success("Verification email sent! Please check your inbox.");
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast.error("Failed to send verification email. Please try again later.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-16 h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#1CAC78]" />
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Render the member profile if user is an NGO member
  if (userType === "ngo" && userRole === "member") {
    return <MemberProfile />;
  }

  // Render the NGO admin settings page
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto p-4 space-y-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold">NGO Settings</h1>
          <div className="flex flex-wrap gap-3 items-center">
            {verificationStatus === "verified" ? (
              <div className="flex items-center flex-wrap gap-3">
                <div className="text-green-600 font-semibold px-4 py-2 bg-green-100 rounded-full flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Profile Verified
                </div>
                <Button
                  className="rounded-full bg-yellow-600 hover:bg-yellow-700 flex items-center gap-2"
                  onClick={handleSwitchToEditingMode}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            ) : approvalStatus === "pending" &&
              verificationStatus === "pending" ? (
              <div className="text-yellow-600 font-semibold px-4 py-2 bg-yellow-100 rounded-full flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verification in Progress
              </div>
            ) : (
              <Button
                className="rounded-full bg-[#1CAC78] hover:bg-[#158f63] flex items-center gap-2"
                onClick={handleVerifyProfile}
                disabled={!isEmailVerified}
                title={
                  !isEmailVerified
                    ? "You must verify your email address first"
                    : ""
                }
              >
                <CheckCircle className="h-4 w-4" />
                Verify Profile
              </Button>
            )}
            {ngoProfile?.donationsData?.isCryptoTransferEnabled &&
              ngoProfile?.donationsData?.ngoOwnerAddContract && (
                <div className="text-green-600 font-semibold px-4 py-2 bg-green-100 rounded-full flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Balance:{" "}
                  {ngoBalancePending
                    ? "Loading..."
                    : ngoBalanceError
                      ? "No Balance"
                      : `${formatEther(ngoBalance)}`}
                </div>
              )}
          </div>
        </div>

        {/* Email verification warning */}
        {!isEmailVerified && (
          <Alert
            variant="warning"
            className="bg-orange-50 border-orange-200 rounded-lg"
          >
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-700 font-medium">
              Email Verification Required
            </AlertTitle>
            <AlertDescription className="text-orange-600 flex flex-col">
              <p className="mb-2">
                Email verification is the only requirement needed to verify your
                NGO profile. Please check your inbox for a verification email.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="self-start mt-1 border-orange-300 text-orange-700 hover:bg-orange-100 hover:text-orange-800"
                onClick={handleResendVerificationEmail}
              >
                Resend Verification Email
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="bank-info">Bank Info</TabsTrigger>
            <TabsTrigger value="security">Passwords</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileInformation
              userId={userId}
              approvalStatus={approvalStatus}
              verificationStatus={verificationStatus}
            />
          </TabsContent>

          <TabsContent value="verification">
            <VerificationInformation
              ngoId={userId}
              approvalStatus={approvalStatus}
              verificationStatus={verificationStatus}
            />
          </TabsContent>

          <TabsContent value="bank-info">
            <DonationInformation
              ngoId={userId}
              approvalStatus={approvalStatus}
              verificationStatus={verificationStatus}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecurityInformation
              userId={userId}
              approvalStatus={approvalStatus}
              verificationStatus={verificationStatus}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Verification Confirmation Dialog */}
      <Dialog
        open={showVerificationDialog}
        onOpenChange={setShowVerificationDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Verify NGO Profile
            </DialogTitle>
            <DialogDescription className="mt-2">
              Your email is verified. Do you want to proceed with NGO profile
              verification?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 text-sm text-yellow-700 mt-2">
            <p className="flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 mt-1 flex-shrink-0" />
              After verification, your profile will be locked for editing until
              the admin approves your NGO.
            </p>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowVerificationDialog(false)}
              disabled={isSubmittingVerification}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmVerifyProfile}
              className="bg-[#1CAC78] hover:bg-[#158f63]"
              disabled={isSubmittingVerification}
            >
              {isSubmittingVerification ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Verify Profile"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mode Confirmation Dialog */}
      <Dialog open={showEditModeDialog} onOpenChange={setShowEditModeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-600">
              Switch to Editing Mode
            </DialogTitle>
            <DialogDescription className="mt-2">
              Your NGO will be unlisted from public pages and you will need to
              re-verify your profile after making changes. Do you want to
              continue?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm text-red-700 mt-2">
            <p className="flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 mt-1 flex-shrink-0" />
              This action will immediately unlist your NGO from public pages
              until re-verification.
            </p>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowEditModeDialog(false)}
              disabled={isSwitchingToEdit}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSwitchToEditingMode}
              variant="destructive"
              disabled={isSwitchingToEdit}
            >
              {isSwitchingToEdit ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Switch to Editing Mode"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NGOSettingsPage;
