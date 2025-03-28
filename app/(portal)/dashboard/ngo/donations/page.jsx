"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DonationsDashboard } from "@/components/donations-dashboard";
import { DonationsTransactions } from "@/components/donations-transactions";
import { PayoutManagement } from "@/components/payout-management";
import { DonorsTable } from "@/components/donors-table";
import CashDonation from "@/components/ngo/CashDonation";
import OnlineDonation from "@/components/ngo/OnlineDonation";
import { CashDonationTable } from "@/components/CashDonationTable";
import { OnlineDonationTable } from "@/components/OnlineDonationTable";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  collectionGroup,
  setDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import Loading from "@/components/loading/Loading";
import { ResDonationTable } from "@/components/ResDonationTable";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { NGOABI } from "@/constants/contract";
import { SuperAdminABI } from "@/constants/contract";
import { formatEther, parseEther } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import { parseUnits } from "ethers/lib/utils";
import ResourcesDonation from "@/components/ngo/ResourcesDonation";
import { CryptoDonationTable } from "@/components/CryptoDonationTable";
import { CryptoPayoutButton } from "@/components/CryptoPayoutButton";
import CryptoDonation from "@/components/ngo/CryptoDonation";

export default function NGODonationsPage() {
  const [user, setUser] = useState(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ngoProfile, setNgoProfile] = useState(null);
  const router = useRouter();
  const [payoutAmount, setPayoutAmount] = useState("");
  const [proofImage, setProofImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // First, get the NGO contract address
  const {
    data: ngoContractAddress,
    error: ngoContractError,
    isPending: ngoContractPending,
  } = useReadContract({
    address: "0xd4fb2E1C31b146b2EA7521d594Eb7e6eCDF02F93", // SuperAdmin contract address
    abi: SuperAdminABI,
    functionName: "ngoContracts",
    args: [ngoProfile?.donationsData?.cryptoWalletAddress],
    enabled: Boolean(ngoProfile?.donationsData?.cryptoWalletAddress),
  });

  // Then, get the available balance using the fetched contract address
  const {
    data: ngoBalance,
    error: ngoBalanceError,
    isPending: ngoBalancePending,
  } = useReadContract({
    address: ngoContractAddress,
    abi: NGOABI,
    functionName: "getAvailableBalance",
    enabled: Boolean(ngoContractAddress),
  });

  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      toast.success("Payout has been added successfully");
      setPayoutAmount("");
      setProofImage(null);
      setIsSubmitting(false);
    }
  }, [isSuccess]);

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        checkAccess(currentUser.uid);
      } else {
        // No user is signed in, redirect to login
        router.replace("/login");
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Check if user has access to this page
  const checkAccess = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      const ngoDoc = await getDoc(doc(db, "ngo", uid));

      if (!userDoc.exists()) {
        router.replace("/login");
        return;
      }

      if (ngoDoc.exists()) {
        setNgoProfile(ngoDoc.data());

        // Check if we need to update donation stats in the NGO profile
        await updateDonationStats(uid);
      }

      const userData = userDoc.data();

      // If user is level1 member, redirect them
      if (
        userData.type === "ngo" &&
        userData.role === "member" &&
        userData.accessLevel === "level1"
      ) {
        router.replace("/dashboard/ngo");
        return;
      }

      // Access is granted, allow the component to render
      setAccessGranted(true);
      setInitialized(true);
      setLoading(false);
    } catch (error) {
      console.error("Error checking access:", error);
      router.replace("/login");
    }
  };

  // Update donation stats in the NGO profile
  const updateDonationStats = async (ngoId) => {
    try {
      const currentYear = new Date().getFullYear().toString();
      let allDonations = [];

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

      // Calculate total donations
      const totalDonated = allDonations.reduce(
        (sum, donation) => sum + Number(donation.amount || 0),
        0
      );

      // Calculate cash donations
      const cashDonated = allDonations
        .filter((donation) => donation.paymentMethod === "Cash")
        .reduce((sum, donation) => sum + Number(donation.amount || 0), 0);

      // Calculate online donations
      const onlineDonated = allDonations
        .filter((donation) => donation.paymentMethod === "Online")
        .reduce((sum, donation) => sum + Number(donation.amount || 0), 0);

      // Update the NGO profile with donation stats
      const ngoRef = doc(db, "ngo", ngoId);
      const ngoDoc = await getDoc(ngoRef);

      if (ngoDoc.exists()) {
        const ngoData = ngoDoc.data();

        // Create or update donationsData object
        const donationsData = {
          ...(ngoData.donationsData || {}),
          totalDonated,
          cashDonated,
          onlineDonated,
          lastUpdated: new Date().toISOString(),
        };

        // Update the NGO document
        await setDoc(
          ngoRef,
          {
            ...ngoData,
            donationsData,
          },
          { merge: true }
        );

        // Update local state
        setNgoProfile({
          ...ngoData,
          donationsData,
        });
      }
    } catch (error) {
      console.error("Error updating donation stats:", error);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setProofImage(e.target.files[0]);
    }
  };

  const handleRequestPayout = async () => {
    try {
      setIsSubmitting(true);

      if (!ngoContractAddress) {
        throw new Error("No contract address found");
      }

      const amount = parseFloat(payoutAmount);
      const payoutAmountUpdated = parseUnits(amount.toString(), 18);
      const balance = parseFloat(formatEther(ngoBalance || 0n));

      if (amount < 1 || amount > balance) {
        throw new Error(`Amount must be between 1 and ${balance} NGC`);
      }

      if (!proofImage) {
        throw new Error("Please upload a proof image");
      }

      // Upload image to Firebase Storage
      const timestamp = Date.now().toString();
      const storageRef = ref(storage, `ngo/${user.uid}/payouts/${timestamp}`);
      await uploadBytes(storageRef, proofImage);
      const imageUrl = await getDownloadURL(storageRef);

      // Request payout through smart contract
      writeContract({
        address: ngoContractAddress,
        abi: NGOABI,
        functionName: "requestPayout",
        args: [payoutAmountUpdated, imageUrl],
      });
    } catch (error) {
      console.error("Error requesting payout:", error);
      toast.error(error.message || "Failed to request payout");
      setIsSubmitting(false);
    }
  };

  // Render loading state until we've checked access
  if (loading) {
    return <Loading />;
  }

  // Only render the component if access is granted
  if (!accessGranted) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">NGO Donations Dashboard</h1>
      <div className="flex flex-col-reverse md:flex-row gap-3 mt-4 justify-between items-center mb-6">
        {ngoProfile?.donationsData?.cryptoPaymentEnabled && ngoBalance && (
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">Available Balance</h3>
            <p className="text-2xl font-bold text-primary">
              {formatEther(ngoBalance)} SMC
            </p>
          </div>
        )}
      </div>

      {/* Stats and Charts - Always visible */}
      <DonationsDashboard />

      {/* Tabs Section - Below Stats and Charts */}
      <Tabs defaultValue="donors" className="mt-6">
        <TabsList>
          <TabsTrigger value="donors">Donors</TabsTrigger>
          <TabsTrigger value="cash">Cash</TabsTrigger>
          <TabsTrigger value="online">Online</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="cryptocurrency">Cryptocurrency</TabsTrigger>
        </TabsList>

        <TabsContent value="donors">
          <DonorsTable />
        </TabsContent>

        <TabsContent value="cash">
          <CashDonationTable />
        </TabsContent>

        <TabsContent value="online">
          <OnlineDonationTable />
        </TabsContent>

        <TabsContent value="resources">
          <ResDonationTable />
        </TabsContent>

        <TabsContent value="cryptocurrency">
          <CryptoDonationTable ngoProfile={ngoProfile} userId={user?.uid} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
