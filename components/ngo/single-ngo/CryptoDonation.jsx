"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { NGOABI, NGOCoinABI, SuperAdminABI } from "@/constants/contract";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useConnect,
  useDisconnect,
} from "wagmi";
import { ethers } from "ethers";
import { parseUnits, formatUnits } from "ethers/lib/utils";
import { toast } from "react-hot-toast";
import { sendWhatsappMessage } from "@/lib/whatsappMessages";
import { injected } from "wagmi/connectors";

const CryptoDonation = ({ ngoData }) => {
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [userData, setUserData] = useState(null);
  const [step, setStep] = useState(1); // 1 = Approve, 2 = Donate
  const [approvalPending, setApprovalPending] = useState(false);
  const [donationPending, setDonationPending] = useState(false);

  // Stable coin contract address
  const STABLE_COIN_ADDRESS = "0xa923E9100D645855167064376E4d31e1382deeBB";

  const { address: walletAddress, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  // Get user's token balance
  const { data: userTokenBalance, isLoading: balanceLoading } = useReadContract(
    {
      address: STABLE_COIN_ADDRESS,
      abi: NGOCoinABI,
      functionName: "balanceOf",
      args: [walletAddress],
      enabled: Boolean(walletAddress),
    }
  );

  // Format token balance for display
  const formattedBalance = userTokenBalance
    ? parseFloat(formatUnits(userTokenBalance, 18))
    : 0;

  // Get NGO contract address from Super Admin contract
  const { data: ngoContractAddress, isLoading: ngoAddressLoading } =
    useReadContract({
      address: "0xBe1cC0D67244B29B903848EF52530538830bD6d7", // Super Admin contract
      abi: SuperAdminABI,
      functionName: "ngoContracts",
      args: [ngoData?.donationsData?.cryptoWalletAddress || walletAddress],
      enabled: Boolean(
        ngoData?.donationsData?.cryptoWalletAddress || walletAddress
      ),
    });

  // Connect wallet handler
  const handleConnectWallet = async () => {
    try {
      await connect({ connector: injected() });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast.error("Failed to connect wallet. Please try again.");
    }
  };

  // Disconnect wallet handler
  const handleDisconnectWallet = () => {
    disconnect();
  };

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserData(userDocSnap.data());
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  // Convert input amount to token units
  const parsedAmount = cryptoAmount
    ? parseUnits(cryptoAmount, 18)
    : parseUnits("0", 18);

  // Handle the approval step
  const handleApprove = async (e) => {
    e?.preventDefault();

    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!ngoContractAddress) {
      toast.error("NGO contract address not found. Please try again later.");
      return;
    }

    setApprovalPending(true);

    try {
      toast.loading("Please confirm the approval in your wallet...", {
        id: "approval",
      });

      const tx = await writeContractAsync({
        address: STABLE_COIN_ADDRESS,
        abi: NGOCoinABI,
        functionName: "approve",
        args: [ngoContractAddress, parsedAmount],
      });

      toast.loading(
        `Approval transaction submitted. Waiting for confirmation...`,
        { id: "approval" }
      );

      const receipt = await waitForTransactionReceipt(tx);

      if (receipt.status === "success") {
        toast.success(
          "Tokens approved successfully! You can now proceed to donation.",
          { id: "approval" }
        );
        setStep(2);
      } else {
        toast.error("Approval transaction failed. Please try again.", {
          id: "approval",
        });
      }
    } catch (error) {
      console.error("Approval error:", error);
      toast.error(
        "Failed to approve tokens: " + (error.message || "Unknown error"),
        { id: "approval" }
      );
    } finally {
      setApprovalPending(false);
    }
  };

  // Wait for transaction receipt (helper function)
  const waitForTransactionReceipt = (hash) => {
    return new Promise((resolve, reject) => {
      const checkReceipt = async () => {
        try {
          // This is a simplified version. In production, use a proper ethers or viem provider
          const provider = window.ethereum
            ? new ethers.providers.Web3Provider(window.ethereum)
            : null;

          if (!provider) {
            reject(new Error("No provider available"));
            return;
          }

          const receipt = await provider.getTransactionReceipt(hash);

          if (receipt) {
            resolve({
              status: receipt.status === 1 ? "success" : "failed",
              receipt,
            });
          } else {
            setTimeout(checkReceipt, 2000);
          }
        } catch (error) {
          reject(error);
        }
      };

      checkReceipt();
    });
  };

  // Handle the donation step
  const handleDonate = async () => {
    if (!ngoContractAddress) {
      toast.error("NGO contract address not found");
      return;
    }

    setDonationPending(true);

    try {
      toast.loading("Please confirm the donation in your wallet...", {
        id: "donation",
      });

      const tx = await writeContractAsync({
        address: ngoContractAddress,
        abi: NGOABI,
        functionName: "donate",
        args: [parsedAmount, true],
      });

      toast.loading(
        `Donation transaction submitted. Waiting for confirmation...`,
        { id: "donation" }
      );

      const receipt = await waitForTransactionReceipt(tx);

      if (receipt.status === "success") {
        toast.success("Donation completed successfully!", { id: "donation" });
        await updateDatabaseRecords();
        // Reset to initial state
        setCryptoAmount("");
        setStep(1);
      } else {
        toast.error("Donation transaction failed. Please try again.", {
          id: "donation",
        });
      }
    } catch (error) {
      console.error("Donation error:", error);

      let errorMessage = "Failed to send donation";

      if (
        error.message &&
        (error.message.includes("function selector was not recognized") ||
          error.message.includes("contract function not found"))
      ) {
        errorMessage =
          "The NGO contract doesn't support donations. Please contact the NGO administrator.";
      } else if (error.message) {
        errorMessage += ": " + error.message;
      }

      toast.error(errorMessage, { id: "donation" });
    } finally {
      setDonationPending(false);
    }
  };

  // Helper function to update database records after successful donation
  const updateDatabaseRecords = async () => {
    if (!auth.currentUser) {
      console.error("User not authenticated");
      return;
    }

    try {
      const donationData = {
        amount: cryptoAmount,
        userId: auth.currentUser.uid,
        ngoId: ngoData.ngoId,
        name: userData?.name || "",
        email: userData?.email || "",
        phone: userData?.phone || "",
        timestamp: new Date().toISOString(),
        transactionType: "crypto",
        walletAddress: walletAddress,
        tokenContract: STABLE_COIN_ADDRESS,
        ngoContract: ngoContractAddress,
        read: false,
      };

      // Record the donation in various places for different views
      await Promise.all([
        // Send WhatsApp notification if configured
        userData?.phone &&
          sendWhatsappMessage(
            donationData.name,
            ngoData.ngoName,
            donationData.timestamp,
            donationData.email,
            donationData.phone,
            donationData.amount
          ),

        // Store donation record in the NGO's donations collection
        setDoc(
          doc(
            db,
            "donations",
            ngoData.ngoId,
            new Date().getFullYear().toString(),
            auth.currentUser.uid,
            "crypto",
            donationData.timestamp
          ),
          donationData,
          { merge: true }
        ),

        // Update user's total tokens donated
        updateDoc(doc(db, "users", auth.currentUser.uid), {
          totalTokensDonated: increment(parseFloat(cryptoAmount)),
        }),

        // Update NGO's total tokens donated
        updateDoc(doc(db, "ngo", ngoData.ngoId), {
          totalTokensDonated: increment(parseFloat(cryptoAmount)),
        }),

        // Record in user's donations list
        setDoc(
          doc(db, "users", auth.currentUser.uid, "donatedTo", ngoData.ngoId),
          {
            tokens: increment(parseFloat(cryptoAmount)),
            timestamp: donationData.timestamp,
          },
          { merge: true }
        ),

        // Add notification for the NGO
        setDoc(
          doc(db, "notifications", ngoData.ngoId),
          {
            notifications: increment([
              {
                title: "New Crypto Donation",
                message: `${userData?.name || "Someone"} donated ${cryptoAmount} tokens to your NGO`,
                timestamp: new Date(),
                read: false,
                type: "success",
                link: "/dashboard/ngo/donations",
              },
            ]),
            unreadCount: increment(1),
          },
          { merge: true }
        ),
      ]);

      toast.success("Donation recorded successfully!");
    } catch (error) {
      console.error("Database update error:", error);
      toast.error(
        "Failed to record donation: " + (error.message || "Unknown error")
      );
    }
  };

  // Reset step back to approval if user wants to change amount
  const handleResetStep = () => {
    setStep(1);
  };

  if (!auth.currentUser) {
    return (
      <div className="text-center py-8">
        <p className="text-lg text-gray-600">Please login to make a donation</p>
        <Button className="mt-4">Login to Donate</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl"
    >
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Donate with Cryptocurrency
          </h2>
          <p className="text-gray-600 mt-1">
            Support {ngoData.ngoName} with our stable token donations
          </p>
        </div>

        {/* Wallet Connection Section */}
        <div className="border-b pb-4">
          {isConnected ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Wallet Connected</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectWallet}
                  className="text-xs"
                >
                  Disconnect
                </Button>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Address:</span>
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {walletAddress}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-600">Token Balance:</span>
                  <span className="text-sm font-medium">
                    {balanceLoading ? (
                      <span className="text-gray-400">Loading...</span>
                    ) : (
                      `${formattedBalance.toLocaleString()} Tokens`
                    )}
                  </span>
                </div>

                {/* Add NGO Contract Address Status */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-600">NGO Contract:</span>
                  <span className="text-sm font-medium">
                    {ngoAddressLoading ? (
                      <span className="text-gray-400">Loading...</span>
                    ) : ngoContractAddress ? (
                      <span className="text-green-500">Ready</span>
                    ) : (
                      <span className="text-yellow-500">Not found</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">
                Connect your wallet to donate with cryptocurrency
              </p>
              <Button
                onClick={handleConnectWallet}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium"
              >
                Connect Wallet
              </Button>
            </div>
          )}
        </div>

        {isConnected ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="cryptoAmount" className="text-gray-700">
                  Donation Amount (Tokens)
                </Label>
                <Input
                  id="cryptoAmount"
                  name="cryptoAmount"
                  type="number"
                  value={cryptoAmount}
                  onChange={(e) => setCryptoAmount(e.target.value)}
                  className="mt-1"
                  placeholder="Enter token amount"
                  disabled={step === 2 || approvalPending || donationPending}
                  required
                />
              </div>

              {step === 1 && (
                <div className="grid grid-cols-3 gap-2">
                  {[10, 50, 100, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className={`px-4 py-2 border rounded-lg transition-colors 
                        ${
                          cryptoAmount === amount.toString()
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      onClick={() => setCryptoAmount(amount.toString())}
                      disabled={approvalPending}
                    >
                      {amount} Tokens
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div className="font-medium text-gray-700">
                Step {step} of 2:{" "}
                {step === 1 ? "Approve Tokens" : "Complete Donation"}
              </div>
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetStep}
                  disabled={donationPending}
                >
                  Edit Amount
                </Button>
              )}
            </div>

            <div className="pt-6 border-t">
              {step === 1 ? (
                <Button
                  onClick={handleApprove}
                  className="w-full h-12 text-lg font-medium bg-emerald-600 hover:bg-emerald-700"
                  disabled={
                    approvalPending ||
                    formattedBalance < parseFloat(cryptoAmount || 0) ||
                    !ngoContractAddress ||
                    ngoAddressLoading
                  }
                >
                  {approvalPending ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Approving...
                    </span>
                  ) : formattedBalance < parseFloat(cryptoAmount || 0) ? (
                    "Insufficient Balance"
                  ) : !ngoContractAddress ? (
                    "NGO Contract Not Found"
                  ) : ngoAddressLoading ? (
                    "Loading NGO Contract..."
                  ) : (
                    "1. Approve Tokens"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleDonate}
                  className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700"
                  disabled={donationPending}
                >
                  {donationPending ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Donating...
                    </span>
                  ) : (
                    "2. Complete Donation"
                  )}
                </Button>
              )}

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">How it works:</span> Your
                  donation will be processed in two steps:
                </p>
                <ol className="list-decimal text-sm text-gray-600 ml-5 mt-2">
                  <li className={step === 2 ? "text-gray-400" : ""}>
                    Approve the token transfer
                    {step === 2 && " ✓"}
                  </li>
                  <li className={step === 1 ? "text-gray-400" : ""}>
                    Complete the donation
                  </li>
                </ol>
                <p className="text-sm text-gray-600 mt-2">
                  Please confirm both transactions in your wallet to complete
                  the donation.
                </p>
              </div>

              <p className="text-center text-sm text-gray-500 mt-4">
                Your donation will directly support {ngoData.ngoName}'s mission
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 border border-dashed border-gray-200 rounded-lg text-center text-gray-500">
            Please connect your wallet to continue with the donation
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CryptoDonation;
