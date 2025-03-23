"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEther, parseUnits } from "viem";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { NGOABI } from "@/constants/contract";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export function CryptoPayoutButton({ ngoProfile, userId }) {
  const [payoutAmount, setPayoutAmount] = useState("");
  const [proofImage, setProofImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [contractAddress, setContractAddress] = useState(null);
  const [isCryptoEnabled, setIsCryptoEnabled] = useState(false);

  // Get contract data on mount
  useEffect(() => {
    const getContractData = async () => {
      if (!ngoProfile) return;

      // Handle different data structures
      let cryptoEnabled = false;
      let contractAddr = null;

      if (ngoProfile.donationsData) {
        cryptoEnabled = ngoProfile.donationsData.isCryptoTransferEnabled;
        contractAddr = ngoProfile.donationsData.ngoOwnerAddContract;
      }

      // If data isn't available, try to fetch from Firebase
      if (!cryptoEnabled && !contractAddr && userId) {
        try {
          const ngoDoc = await getDoc(doc(db, "ngo", userId));
          if (ngoDoc.exists()) {
            const ngoData = ngoDoc.data();
            if (ngoData.donationsData) {
              cryptoEnabled = ngoData.donationsData.isCryptoTransferEnabled;
              contractAddr = ngoData.donationsData.ngoOwnerAddContract;
            }
          }
        } catch (error) {
          console.error("Error fetching NGO data:", error);
        }
      }

      setIsCryptoEnabled(!!cryptoEnabled);
      setContractAddress(contractAddr);
    };

    getContractData();
  }, [ngoProfile, userId]);

  const {
    data: ngoBalance,
    error: ngoBalanceError,
    isPending: ngoBalancePending,
  } = useReadContract({
    address: contractAddress,
    abi: NGOABI,
    functionName: "getAvailableBalance",
    enabled: Boolean(contractAddress),
  });

  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && isSubmitting) {
      toast.success("Payout has been added successfully");
      setPayoutAmount("");
      setProofImage(null);
      setIsSubmitting(false);
      setPayoutModalOpen(false);
    }
  }, [isSuccess, isSubmitting]);

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setProofImage(e.target.files[0]);
    }
  };

  const handleRequestPayout = async () => {
    try {
      setIsSubmitting(true);

      if (!contractAddress) {
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
      const storageRef = ref(storage, `ngo/${userId}/payouts/${timestamp}`);
      await uploadBytes(storageRef, proofImage);
      const imageUrl = await getDownloadURL(storageRef);

      // Request payout through smart contract
      writeContract({
        address: contractAddress,
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

  // Only render if crypto transfer is enabled and contract address exists
  if (!isCryptoEnabled || !contractAddress) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-green-600 font-semibold px-4 py-2 bg-green-100 rounded-lg text-sm whitespace-nowrap">
        Balance:{" "}
        {ngoBalancePending
          ? "Loading..."
          : ngoBalanceError
            ? "Error"
            : `${formatEther(ngoBalance || 0n)} NGC`}
      </div>
      <Button 
        onClick={() => setPayoutModalOpen(true)}
        className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
      >
        Request Payout
      </Button>

      <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Cryptocurrency Payout</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-green-600 font-semibold px-4 py-2 bg-green-100 rounded-lg text-center">
              Available Balance:{" "}
              {ngoBalancePending
                ? "Loading..."
                : ngoBalanceError
                  ? "Error loading balance"
                  : `${formatEther(ngoBalance || 0n)} NGC`}
            </div>
            <div className="grid gap-2">
              <Input
                type="number"
                placeholder="Amount (NGC)"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                min="1"
                max={formatEther(ngoBalance || 0n)}
              />
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Please upload a proof image for verification purposes.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setPayoutModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestPayout}
              disabled={isSubmitting || !payoutAmount || !proofImage}
            >
              {isSubmitting ? "Processing..." : "Request Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 