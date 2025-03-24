"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEther } from "viem";
import {
  useReadContract,
  useWriteContract,
  useAccount,
  useConnect,
  useDisconnect,
} from "wagmi";
import { NGOABI, SuperAdminABI } from "@/constants/contract";
import { storage, db, auth } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  setDoc,
  increment,
} from "firebase/firestore";
import { ethers } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function CryptoPayoutButton({
  ngoContractAddress: pngoContractAddress,
}) {
  const [payoutAmount, setPayoutAmount] = useState("");
  const [proofImage, setProofImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [ngoProfile, setNgoProfile] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isCryptoEnabled, setIsCryptoEnabled] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      await connect({ connector: injected() });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast.error("Failed to connect wallet. Please try again.");
    }
  };

  // Handle wallet disconnection
  const handleDisconnectWallet = () => {
    disconnect();
  };

  // Step 1: First fetch the NGO profile and wallet address
  useEffect(() => {
    const fetchNgoProfile = async () => {
      if (!auth.currentUser) return;

      try {
        const ngoDoc = await getDoc(doc(db, "ngo", auth.currentUser.uid));
        if (ngoDoc.exists()) {
          const profile = ngoDoc.data();
          setNgoProfile(profile);

          // Get crypto payment status - check both potential field names
          const cryptoEnabled =
            profile.donationsData?.isCryptoTransferEnabled ||
            profile.donationsData?.cryptoPaymentEnabled ||
            false;
          setIsCryptoEnabled(cryptoEnabled);

          // Get wallet address
          const walletAddr = profile.donationsData?.cryptoWalletAddress || null;
          setWalletAddress(walletAddr);

          console.log("NGO Profile Loaded for Payout:", {
            uid: auth.currentUser.uid,
            isCryptoEnabled: cryptoEnabled,
            walletAddress: walletAddr,
          });
        }
      } catch (error) {
        console.error("Error fetching NGO profile:", error);
      }
    };

    fetchNgoProfile();
  }, []);

  // Step 2: Then fetch the contract address using the wallet address
  const {
    data: ngoContractAddress,
    error: ngoContractError,
    isPending: ngoContractPending,
    refetch: refetchContractAddress,
  } = useReadContract({
    address: "0xd4fb2E1C31b146b2EA7521d594Eb7e6eCDF02F93", // SuperAdmin contract address
    abi: SuperAdminABI,
    functionName: "ngoContracts",
    args: [walletAddress],
    enabled: Boolean(walletAddress && isCryptoEnabled),
    onSuccess: (data) => {
      console.log("NGO Contract Address fetched for payout:", data);
    },
    onError: (error) => {
      console.error("Error fetching NGO contract address for payout:", error);
    },
  });
  console.log("NGO CONTRACT ADDRESS", pngoContractAddress);

  // Step 3: Finally fetch the balance using the contract address
  const {
    data: ngoBalance,
    error: ngoBalanceError,
    isPending: ngoBalancePending,
    refetch: refetchBalance,
  } = useReadContract({
    address: pngoContractAddress,
    abi: NGOABI,
    functionName: "getAvailableBalance",
    enabled: Boolean(pngoContractAddress),
    onSuccess: (data) => {
      console.log("NGO Balance fetched for payout:", formatEther(data), "SMC");
    },
    onError: (error) => {
      console.error("Error fetching NGO balance for payout:", error);
    },
  });

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setProofImage(e.target.files[0]);
    }
  };

  // Add waitForTransactionReceipt helper function
  const waitForTransactionReceipt = (hash) => {
    return new Promise((resolve, reject) => {
      const checkReceipt = async () => {
        try {
          // Create provider more reliably with Sepolia configuration
          let provider;
          if (window.ethereum) {
            // Ensure we're on Sepolia testnet
            const chainId = await window.ethereum.request({
              method: "eth_chainId",
            });
            if (chainId !== "0xaa36a7") {
              // Sepolia chainId
              throw new Error("Please switch to Sepolia testnet");
            }
            provider = new ethers.providers.Web3Provider(window.ethereum);
          } else {
            // Fallback to Sepolia public provider with proper configuration
            provider = new ethers.providers.JsonRpcProvider(
              "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
            );
          }

          if (!provider) {
            reject(new Error("No provider available"));
            return;
          }

          // Get the transaction receipt
          const receipt = await provider.getTransactionReceipt(hash);

          if (receipt) {
            // Check if the transaction was successful
            if (receipt.status === 1) {
              resolve({
                status: "success",
                receipt,
              });
            } else {
              resolve({
                status: "failed",
                receipt,
              });
            }
          } else {
            // Transaction not yet mined, check again in 2 seconds
            setTimeout(checkReceipt, 2000);
          }
        } catch (error) {
          console.error("Error checking transaction receipt:", error);
          reject(error);
        }
      };

      // Start checking for the receipt
      checkReceipt();
    });
  };

  const handleRequestPayout = async () => {
    try {
      setIsSubmitting(true);

      if (!isConnected) {
        throw new Error("Please connect your wallet first");
      }

      if (!pngoContractAddress) {
        throw new Error("No contract address found");
      }

      const amount = parseFloat(payoutAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      const balance = parseFloat(formatEther(ngoBalance || BigInt(0)));

      if (amount > balance) {
        throw new Error(
          `Amount cannot exceed your available balance of ${balance} SMC`
        );
      }

      if (!proofImage) {
        throw new Error("Please upload a proof image");
      }

      // Upload image to Firebase Storage
      const timestamp = Date.now().toString();
      const storageRef = ref(
        storage,
        `ngo/${auth.currentUser.uid}/payouts/${timestamp}`
      );
      await uploadBytes(storageRef, proofImage);
      const imageUrl = await getDownloadURL(storageRef);

      // Call the smart contract
      toast.loading("Please confirm the payout request in your wallet...", {
        id: "payout",
      });

      const tx = await writeContractAsync({
        address: pngoContractAddress,
        abi: NGOABI,
        functionName: "requestPayout",
        args: [parseUnits(amount.toString(), 18), imageUrl],
        overrides: {
          gasLimit: 500000, // Increased for Sepolia testnet
        },
      });

      toast.loading(
        `Payout request transaction submitted. Waiting for confirmation...`,
        { id: "payout" }
      );

      // Wait for transaction receipt
      const receipt = await waitForTransactionReceipt(tx);

      if (receipt.status === "success") {
        // Store the request in Firebase
        await addDoc(
          collection(db, `ngo/${auth.currentUser.uid}/payoutRequests`),
          {
            amount: amount.toString(),
            amountInSMC: amount,
            proofImage: imageUrl,
            status: "pending",
            contractAddress: pngoContractAddress,
            timestamp: serverTimestamp(),
            walletAddress: address,
            txHash: tx,
          }
        );

        // Add notification for the user
        const notificationDoc = doc(db, "notifications", auth.currentUser.uid);
        try {
          const docSnap = await getDoc(notificationDoc);
          let existingNotifications = [];
          if (docSnap.exists() && docSnap.data().notifications) {
            existingNotifications = docSnap.data().notifications;
          }

          const newNotification = {
            title: "Payout Request Submitted",
            message: `Your payout request for ${amount} SMC tokens has been submitted successfully.`,
            timestamp: new Date(),
            read: false,
            type: "success",
            link: "/dashboard/ngo/payouts",
          };

          await setDoc(
            notificationDoc,
            {
              notifications: [newNotification, ...existingNotifications],
              unreadCount: increment(1),
            },
            { merge: true }
          );
        } catch (error) {
          console.error("Error adding notification:", error);
        }

        // Show success message
        toast.success("Payout request submitted successfully", {
          id: "payout",
        });

        // Reset form
        setPayoutAmount("");
        setProofImage(null);
        setIsSubmitting(false);
        setPayoutModalOpen(false);

        // Wait a bit and then refetch the balance
        setTimeout(() => {
          refetchBalance();
        }, 2000);
      } else {
        toast.error("Payout request transaction failed. Please try again.", {
          id: "payout",
        });
      }
    } catch (error) {
      console.error("Error requesting payout:", error);
      let errorMessage = "Failed to request payout";

      if (
        error.message &&
        error.message.includes("user rejected transaction")
      ) {
        errorMessage = "Transaction was rejected in your wallet";
      } else if (
        error.message &&
        error.message.includes("insufficient funds")
      ) {
        errorMessage =
          "Insufficient funds for gas * price + value. You may need Sepolia ETH for gas.";
      } else if (
        error.message &&
        error.message.includes("Connector not connected")
      ) {
        errorMessage = "Please connect your wallet first";
      } else if (error.message) {
        errorMessage += ": " + error.message;
      }

      toast.error(errorMessage, { id: "payout" });
      setIsSubmitting(false);
    }
  };

  // Only render if crypto transfer is enabled and wallet address exists
  if (!isCryptoEnabled || !walletAddress) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {isConnected ? (
        <>
          <div className="text-green-600 font-semibold px-4 py-2 bg-green-100 rounded-lg text-sm whitespace-nowrap">
            Balance:{" "}
            {ngoBalancePending
              ? "Loading..."
              : ngoBalanceError
                ? "Error"
                : `${formatEther(ngoBalance || BigInt(0))} SMC`}
          </div>
          <Button
            onClick={() => setPayoutModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
          >
            Request Payout
          </Button>
        </>
      ) : (
        <ConnectButton />
      )}

      <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Submit a payout request for your SMC tokens
            </DialogTitle>
            <DialogDescription>
              Submit a request to withdraw your SMC tokens to your wallet
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-green-600 font-semibold px-4 py-2 bg-green-100 rounded-lg text-center">
              Available Balance:{" "}
              {ngoBalancePending
                ? "Loading..."
                : ngoBalanceError
                  ? "Error loading balance"
                  : `${formatEther(ngoBalance || BigInt(0))} SMC`}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payout-amount">Amount (SMC)</Label>
              <Input
                id="payout-amount"
                type="number"
                placeholder="Enter amount to withdraw"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                min="0.01"
                step="0.01"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="proof-document">Proof Document</Label>
              <Input
                id="proof-document"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">
                Upload an image as proof for your payout request.
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
              disabled={
                isSubmitting ||
                !payoutAmount ||
                !proofImage ||
                !pngoContractAddress ||
                ngoBalancePending ||
                parseFloat(payoutAmount) <= 0
              }
            >
              {isSubmitting ? "Processing..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
