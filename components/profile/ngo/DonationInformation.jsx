import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CheckCircleIcon,
  CreditCard,
  Building,
  Wallet,
  MessageSquare,
  KeyRound,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  BanknoteIcon,
  RefreshCw,
  Edit,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; // Import Firestore
import { doc, updateDoc, getDoc } from "firebase/firestore"; // Import updateDoc and getDoc functions
import toast from "react-hot-toast";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useWriteContract, useReadContract } from "wagmi";
import { SuperAdminABI } from "@/constants/contract";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const RequiredLabel = ({ children }) => (
  <Label className="flex items-center gap-1 text-sm font-medium">
    <span className="text-red-500">*</span>
    {children}
  </Label>
);

const DonationInformation = ({ ngoId, approvalStatus, verificationStatus }) => {
  const [donationsData, setDonationsData] = useState({
    razorpayKeyId: "",
    razorpayKeySecret: "",
    isBankTransferEnabled: false,
    isCryptoTransferEnabled: false,
    cryptoWalletAddress: "",
    bankTransferDetails: {
      accountHolderName: "",
      bankName: "",
      branchNameAddress: "",
      accountNumber: "",
      accountType: "",
      ifscCode: "",
    },
    acknowledgmentMessage: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUpdatingWallet, setIsUpdatingWallet] = useState(false);
  const [currentStoredWallet, setCurrentStoredWallet] = useState(null);
  const [contractWriteStatus, setContractWriteStatus] = useState("idle"); // idle, pending, success, error
  // Add state to track if we're currently updating a contract address
  const [isUpdatingContractAddress, setIsUpdatingContractAddress] =
    useState(false);
  const [newContractAddress, setNewContractAddress] = useState(null);
  // Add state to hold pending data while waiting for contract creation
  const [pendingDonationsData, setPendingDonationsData] = useState(null);

  const { data: hash, isPending, writeContract } = useWriteContract();
  const { address: walletAddress, isConnected } = useAccount();

  const {
    data: ngoOwnerAddContract,
    error: ngoOwnerError,
    isPending: ngoOwnerAddPending,
  } = useReadContract({
    address: "0xBe1cC0D67244B29B903848EF52530538830bD6d7",
    abi: SuperAdminABI,
    functionName: "ngoContracts",
    args: [donationsData.cryptoWalletAddress || walletAddress],
  });

  // Convert zero address to null
  const formattedNgoOwnerContract =
    ngoOwnerAddContract === "0x0000000000000000000000000000000000000000"
      ? null
      : ngoOwnerAddContract;

  // Fetch donation data once on component mount
  useEffect(() => {
    const fetchDonationData = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, "ngo", ngoId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data()?.donationsData) {
          const data = docSnap.data().donationsData;
          setDonationsData(data);
          setCurrentStoredWallet(data.cryptoWalletAddress || null);
        }
      } catch (error) {
        toast.error("Failed to load donation settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDonationData();
  }, [ngoId]);

  // Only update cryptoWalletAddress when in update mode and wallet connection changes
  useEffect(() => {
    if (isUpdatingWallet && isConnected) {
      setDonationsData((prev) => ({
        ...prev,
        cryptoWalletAddress: walletAddress,
      }));
    }
  }, [walletAddress, isConnected, isUpdatingWallet]);

  // Track contract transaction status
  useEffect(() => {
    if (isPending) {
      setContractWriteStatus("pending");
    } else if (hash && !isPending) {
      setContractWriteStatus("success");

      // If we have a transaction hash, we need to monitor when the contract is
      // actually deployed to get its address
      if (isUpdatingContractAddress) {
        monitorContractCreation(hash);
      }
    } else if (!isPending && isUpdatingContractAddress && !hash) {
      // This means the transaction was canceled by the user in MetaMask
      console.log("Transaction was canceled by user");
      setContractWriteStatus("idle");
      setIsUpdatingContractAddress(false);
      setIsSaving(false);
      toast.info("Contract creation was canceled.");
    }
  }, [isPending, hash, isUpdatingContractAddress]);

  // Function to monitor contract creation and get the deployed contract address
  const monitorContractCreation = async (txHash) => {
    try {
      // Poll for contract address every few seconds
      const checkInterval = setInterval(async () => {
        // Call the contract to check if the NGO's contract address is now available
        const ngoContract = await fetch(
          `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=YourApiKeyToken`
        );
        const data = await ngoContract.json();

        if (data.result && data.result.status === "0x1") {
          // Transaction succeeded, now check for the NGO contract address
          const addressCheckResult = await fetch(
            `https://api-sepolia.etherscan.io/api?module=account&action=txlistinternal&txhash=${txHash}&apikey=YourApiKeyToken`
          );
          const addressData = await addressCheckResult.json();

          if (addressData.result && addressData.result.length > 0) {
            // Get the contract address from the transaction (may need adjustment based on your contract structure)
            const contractAddress = addressData.result[0].contractAddress;

            if (contractAddress) {
              clearInterval(checkInterval);
              setNewContractAddress(contractAddress);

              // Now save the data to Firestore, but we don't include the contract address anymore
              if (pendingDonationsData) {
                await saveAllDataWithContract(pendingDonationsData);
              }
            }
          }
        } else if (data.result && data.result.status === "0x0") {
          // Transaction failed
          clearInterval(checkInterval);
          setContractWriteStatus("error");
          toast.error("Contract creation failed. Please try again.");
          setIsUpdatingContractAddress(false);
          setIsSaving(false);
          setPendingDonationsData(null);
        }
      }, 5000); // Check every 5 seconds

      // Set a timeout to stop checking after 3 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (contractWriteStatus === "pending") {
          setContractWriteStatus("error");
          toast.error(
            "Timed out waiting for contract creation. Please check your transaction and try again."
          );
          setIsUpdatingContractAddress(false);
          setIsSaving(false);
          setPendingDonationsData(null);
        }
      }, 180000);
    } catch (error) {
      console.error("Error monitoring contract creation:", error);
      setContractWriteStatus("error");
      setIsUpdatingContractAddress(false);
      setIsSaving(false);
      setPendingDonationsData(null);
    }
  };

  // Function to save all data including contract address to Firestore
  const saveAllDataWithContract = async (data) => {
    try {
      if (!data) return;

      // Don't add the contract address to the data anymore
      const completeData = {
        ...data,
        // We don't save ngoOwnerAddContract anymore
      };

      // Save everything to Firestore
      const docRef = doc(db, "ngo", ngoId);
      await updateDoc(docRef, {
        donationsData: completeData,
      });

      // Update state with the successfully saved data
      setDonationsData(completeData);
      setCurrentStoredWallet(completeData.cryptoWalletAddress);

      // Reset wallet update mode
      setIsUpdatingWallet(false);

      toast.success("Settings saved successfully!");
      setIsUpdatingContractAddress(false);
      setIsSaving(false);
      setPendingDonationsData(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Failed to save settings.");
      setIsUpdatingContractAddress(false);
      setIsSaving(false);
      setPendingDonationsData(null);
    }
  };

  const addNgoInContract = async () => {
    try {
      setContractWriteStatus("pending");
      setIsUpdatingContractAddress(true);

      const tx = await writeContract({
        address: "0xBe1cC0D67244B29B903848EF52530538830bD6d7",
        abi: SuperAdminABI,
        functionName: "createNGO",
        args: [
          donationsData.cryptoWalletAddress,
          "0xAbFb2AeF4aAC335Cda2CeD2ddd8A6521047e8ddF",
        ],
      });

      toast.success(
        "NGO contract creation initiated. Please confirm in your wallet."
      );
      return true;
    } catch (error) {
      console.error("Contract creation error:", error);
      setContractWriteStatus("error");
      setIsUpdatingContractAddress(false);
      setPendingDonationsData(null);
      toast.error("Failed to create NGO contract");
      return false;
    }
  };

  const handleUpdateWalletClick = () => {
    setIsUpdatingWallet(true);
  };

  const handleCancelWalletUpdate = () => {
    setIsUpdatingWallet(false);
    // Revert to the previously stored wallet address
    setDonationsData((prev) => ({
      ...prev,
      cryptoWalletAddress: currentStoredWallet,
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!donationsData.razorpayKeyId || !donationsData.razorpayKeySecret) {
      toast.error("Razorpay Key ID and Secret are required.");
      return;
    }

    if (
      donationsData.isBankTransferEnabled &&
      (!donationsData.bankTransferDetails ||
        !donationsData.bankTransferDetails.accountHolderName ||
        !donationsData.bankTransferDetails.bankName ||
        !donationsData.bankTransferDetails.branchNameAddress ||
        !donationsData.bankTransferDetails.accountNumber ||
        !donationsData.bankTransferDetails.accountType ||
        !donationsData.bankTransferDetails.ifscCode)
    ) {
      toast.error("All bank transfer details are required.");
      return;
    }

    // Wallet validation for crypto donations
    if (donationsData.isCryptoTransferEnabled) {
      // Check if there's a wallet address when enabling crypto
      if (!donationsData.cryptoWalletAddress) {
        toast.error("Please connect a wallet to enable crypto transfers.");
        return;
      }

      // Check if user is updating wallet and hasn't connected
      if (isUpdatingWallet && !isConnected) {
        toast.error("Please connect your new wallet before saving.");
        return;
      }
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      let updatedDonationsData = { ...donationsData };

      // Handle crypto-related data differently
      if (updatedDonationsData.isCryptoTransferEnabled) {
        // 1. Check if we need to create a contract
        const needsContractCreation =
          !formattedNgoOwnerContract &&
          updatedDonationsData.cryptoWalletAddress;

        // 2. If a contract creation is needed, handle it separately
        if (needsContractCreation) {
          // Prepare data including wallet address but not contract address
          updatedDonationsData = {
            ...updatedDonationsData,
            ngoOwnerAdd: updatedDonationsData.cryptoWalletAddress,
            // We don't save contract address to Firestore anymore
          };

          // Store the data in state temporarily - don't save to Firestore yet
          setPendingDonationsData(updatedDonationsData);

          // Start contract creation
          const success = await addNgoInContract();
          if (!success) {
            setIsSaving(false);
            setPendingDonationsData(null);
            toast.error("Failed to initiate contract creation.");
            return;
          }

          // Inform the user we're waiting for their confirmation
          toast.info(
            "Please confirm the transaction in your wallet. Your settings will be saved after confirmation."
          );

          // The rest will be handled after contract creation completes
          // Keep the saving state active until contract creation is done
          return;
        } else {
          // No contract creation needed, just update the wallet address
          updatedDonationsData = {
            ...updatedDonationsData,
            ngoOwnerAdd: updatedDonationsData.cryptoWalletAddress,
            // We don't save contract address to Firestore anymore
          };
        }
      } else {
        // If crypto is disabled, clear all related fields
        updatedDonationsData.cryptoWalletAddress = null;
        updatedDonationsData.ngoOwnerAdd = null;
        // We don't manage ngoOwnerAddContract in Firestore anymore
      }

      // Only save to Firestore if we're not creating a contract
      // (contract creation case is handled by saveAllDataWithContract)
      if (!isUpdatingContractAddress) {
        // Save the updated data
        await saveAllDataWithContract(updatedDonationsData);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to update donation settings.");
      setPendingDonationsData(null);
    } finally {
      if (!isUpdatingContractAddress) {
        setIsSaving(false);
      }
    }
  };

  const handleChange = (e, key) => {
    setDonationsData((prev) => ({ ...prev, [key]: e.target.value }));
    setSaveSuccess(false);
  };

  const handleBankTransferChange = (e, key) => {
    // Initialize bankTransferDetails if it doesn't exist
    const currentBankDetails = donationsData.bankTransferDetails || {
      accountHolderName: "",
      bankName: "",
      branchNameAddress: "",
      accountNumber: "",
      accountType: "",
      ifscCode: "",
    };

    setDonationsData((prev) => ({
      ...prev,
      bankTransferDetails: {
        ...currentBankDetails,
        [key]: e.target.value,
      },
    }));

    setSaveSuccess(false);
  };

  const toggleBankTransfer = () => {
    // Initialize bank details if enabling for the first time
    if (
      !donationsData.isBankTransferEnabled &&
      !donationsData.bankTransferDetails
    ) {
      setDonationsData((prev) => ({
        ...prev,
        isBankTransferEnabled: true,
        bankTransferDetails: {
          accountHolderName: "",
          bankName: "",
          branchNameAddress: "",
          accountNumber: "",
          accountType: "",
          ifscCode: "",
        },
      }));
    } else {
      setDonationsData((prev) => ({
        ...prev,
        isBankTransferEnabled: !prev.isBankTransferEnabled,
      }));
    }

    setSaveSuccess(false);
  };

  const toggleCryptoTransfer = () => {
    setDonationsData((prev) => ({
      ...prev,
      isCryptoTransferEnabled: !prev.isCryptoTransferEnabled,
    }));

    setSaveSuccess(false);
  };

  const shouldDisableInputs =
    (verificationStatus === "verified" && approvalStatus === "verified") ||
    (verificationStatus === "pending" && approvalStatus === "pending");

  const pendingTitle =
    "You cannot update the profile while the verification is in progress";

  const getVerificationStatusBadge = () => {
    if (verificationStatus === "verified" && approvalStatus === "verified") {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-4 h-4 mr-1" /> Verified
        </div>
      );
    } else if (
      verificationStatus === "pending" ||
      approvalStatus === "pending"
    ) {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          <AlertCircle className="w-4 h-4 mr-1" /> Pending Verification
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          <AlertCircle className="w-4 h-4 mr-1" /> Not Verified
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#1CAC78]" />
      </div>
    );
  }

  return (
    <div className="mx-auto">
      <Card className="shadow-md border-0 overflow-hidden">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-6 w-6" />
              <CardTitle className="text-xl">
                Donation & Payout Settings
              </CardTitle>
            </div>
            {getVerificationStatusBadge()}
          </div>
          <p className="mt-2 text-sm">
            Configure payment methods and settings for accepting donations
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {/* Razorpay Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-full">
                <KeyRound className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium">Razorpay API Keys</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                <AlertCircle className="h-5 w-5 text-gray-500 mt-0.5" />
                <p className="text-sm text-gray-600">
                  Enter your Razorpay API keys to enable online payment
                  processing. You can find these in your Razorpay dashboard.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <RequiredLabel>Razorpay Key ID</RequiredLabel>
                  <div className="relative">
                    <Input
                      placeholder="rzp_live_xxxxxxxxxxxxxxx"
                      value={donationsData.razorpayKeyId}
                      onChange={(e) => handleChange(e, "razorpayKeyId")}
                      className="border-gray-300 pl-8"
                      required
                      disabled={shouldDisableInputs}
                      title={
                        shouldDisableInputs
                          ? pendingTitle
                          : "Your Razorpay Key ID"
                      }
                    />
                    <KeyRound className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <RequiredLabel>Razorpay Key Secret</RequiredLabel>
                  <div className="relative">
                    <Input
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                      value={donationsData.razorpayKeySecret}
                      onChange={(e) => handleChange(e, "razorpayKeySecret")}
                      className="border-gray-300 pl-8"
                      type="password"
                      required
                      disabled={shouldDisableInputs}
                      title={
                        shouldDisableInputs
                          ? pendingTitle
                          : "Your Razorpay Key Secret"
                      }
                    />
                    <Lock className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bank Transfer Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-violet-50 rounded-full">
                <Building className="h-5 w-5 text-violet-500" />
              </div>
              <h3 className="text-lg font-medium">Bank Transfer</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <Switch
                  id="bank-transfer"
                  className="data-[state=checked]:bg-[#1CAC78]"
                  checked={donationsData.isBankTransferEnabled}
                  onCheckedChange={toggleBankTransfer}
                  disabled={shouldDisableInputs}
                />
                <Label htmlFor="bank-transfer" className="ml-3 font-medium">
                  {donationsData.isBankTransferEnabled
                    ? "Bank Transfer Enabled"
                    : "Enable Bank Transfer Option"}
                </Label>
              </div>

              {donationsData.isBankTransferEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 mt-4 p-4 border rounded-lg bg-gray-50">
                  <div className="space-y-2">
                    <RequiredLabel>Account Holder Name</RequiredLabel>
                    <Input
                      placeholder="Full name on account"
                      value={
                        donationsData.bankTransferDetails?.accountHolderName ||
                        ""
                      }
                      onChange={(e) =>
                        handleBankTransferChange(e, "accountHolderName")
                      }
                      className="border-gray-300 bg-white"
                      required
                      disabled={shouldDisableInputs}
                    />
                  </div>

                  <div className="space-y-2">
                    <RequiredLabel>Bank Name</RequiredLabel>
                    <Input
                      placeholder="Name of your bank"
                      value={donationsData.bankTransferDetails?.bankName || ""}
                      onChange={(e) => handleBankTransferChange(e, "bankName")}
                      className="border-gray-300 bg-white"
                      required
                      disabled={shouldDisableInputs}
                    />
                  </div>

                  <div className="space-y-2">
                    <RequiredLabel>Branch Name & Address</RequiredLabel>
                    <Input
                      placeholder="Branch location details"
                      value={
                        donationsData.bankTransferDetails?.branchNameAddress ||
                        ""
                      }
                      onChange={(e) =>
                        handleBankTransferChange(e, "branchNameAddress")
                      }
                      className="border-gray-300 bg-white"
                      required
                      disabled={shouldDisableInputs}
                    />
                  </div>

                  <div className="space-y-2">
                    <RequiredLabel>Account Number</RequiredLabel>
                    <Input
                      placeholder="Your account number"
                      value={
                        donationsData.bankTransferDetails?.accountNumber || ""
                      }
                      onChange={(e) =>
                        handleBankTransferChange(e, "accountNumber")
                      }
                      className="border-gray-300 bg-white"
                      required
                      disabled={shouldDisableInputs}
                    />
                  </div>

                  <div className="space-y-2">
                    <RequiredLabel>Account Type</RequiredLabel>
                    <Input
                      placeholder="Savings/Current"
                      value={
                        donationsData.bankTransferDetails?.accountType || ""
                      }
                      onChange={(e) =>
                        handleBankTransferChange(e, "accountType")
                      }
                      className="border-gray-300 bg-white"
                      required
                      disabled={shouldDisableInputs}
                    />
                  </div>

                  <div className="space-y-2">
                    <RequiredLabel>IFSC Code</RequiredLabel>
                    <Input
                      placeholder="Branch IFSC code"
                      value={donationsData.bankTransferDetails?.ifscCode || ""}
                      onChange={(e) => handleBankTransferChange(e, "ifscCode")}
                      className="border-gray-300 bg-white"
                      required
                      disabled={shouldDisableInputs}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Crypto Transfer Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-emerald-50 rounded-full">
                <Wallet className="h-5 w-5 text-emerald-500" />
              </div>
              <h3 className="text-lg font-medium">Cryptocurrency</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <Switch
                  id="crypto-transfer"
                  className="data-[state=checked]:bg-[#1CAC78]"
                  checked={donationsData.isCryptoTransferEnabled}
                  onCheckedChange={toggleCryptoTransfer}
                  disabled={shouldDisableInputs}
                />
                <Label htmlFor="crypto-transfer" className="ml-3 font-medium">
                  {donationsData.isCryptoTransferEnabled
                    ? "Cryptocurrency Donations Enabled"
                    : "Enable Cryptocurrency Donations"}
                </Label>
              </div>

              {donationsData.isCryptoTransferEnabled && (
                <div className="space-y-4 mt-4 p-4 border rounded-lg bg-gray-50">
                  <div className="space-y-2">
                    <RequiredLabel>Wallet Connection</RequiredLabel>

                    {!isUpdatingWallet && donationsData.cryptoWalletAddress && (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                          <p className="text-sm text-gray-600">
                            Connected Wallet Address:
                          </p>
                          <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm font-mono text-blue-700 break-all">
                              {donationsData.cryptoWalletAddress}
                            </p>
                          </div>

                          {!shouldDisableInputs && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="self-start mt-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={handleUpdateWalletClick}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1.5" />
                              Update Wallet Address
                            </Button>
                          )}
                        </div>

                        {formattedNgoOwnerContract && (
                          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center">
                              <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                              <span className="font-medium text-green-800">
                                Contract Deployed
                              </span>
                            </div>
                            <p className="text-sm text-green-700 mt-1">
                              Your donation contract is active and ready to
                              receive funds.
                            </p>
                            <div className="mt-2 px-3 py-2 bg-white rounded border border-green-200">
                              <p className="text-xs font-mono text-green-700 break-all">
                                {formattedNgoOwnerContract}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(isUpdatingWallet ||
                      !donationsData.cryptoWalletAddress) && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600 mb-3">
                          {isUpdatingWallet
                            ? "Connect your new Ethereum wallet. This will update your payment receiving address."
                            : "Connect your Ethereum wallet to receive crypto donations. This will create a smart contract for your organization."}
                        </p>

                        <div className="flex flex-col md:flex-row items-start gap-4">
                          <div className="w-fit">
                            <ConnectButton />
                          </div>

                          {isConnected && (
                            <div className="flex items-center px-3 py-2 bg-blue-50 rounded-md text-blue-700 border border-blue-200 max-w-md break-all">
                              <p className="text-sm font-mono">
                                {walletAddress}
                              </p>
                            </div>
                          )}
                        </div>

                        {isUpdatingWallet && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelWalletUpdate}
                              className="text-gray-600"
                            >
                              Cancel
                            </Button>
                            <p className="text-xs text-gray-500 mt-1">
                              After connecting your wallet, click "Save Payment
                              Settings" to update
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isUpdatingWallet &&
                    isConnected &&
                    !formattedNgoOwnerContract && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
                        <p className="text-sm text-yellow-700">
                          Save your settings to deploy a new contract with this
                          wallet address. This will create a blockchain
                          transaction.
                        </p>
                      </div>
                    )}

                  {ngoOwnerError && donationsData.isCryptoTransferEnabled && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                        <span className="font-medium text-red-800">
                          Error Loading Contract
                        </span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        There was an error loading your contract information.
                        Please try again.
                      </p>
                    </div>
                  )}

                  {ngoOwnerAddPending &&
                    donationsData.isCryptoTransferEnabled && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                          <Loader2 className="w-5 h-5 text-blue-600 mr-2 animate-spin" />
                          <span className="font-medium text-blue-800">
                            Loading Contract Data...
                          </span>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </section>

          {/* Acknowledgment Message Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-full">
                <MessageSquare className="h-5 w-5 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium">Donation Acknowledgment</h3>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Customize the thank you message that donors will see after their
                donation is complete.
              </p>

              <Textarea
                placeholder="Enter your custom thank you message for donors. Example: Thank you for your generous donation to our cause! Your support makes a real difference."
                value={donationsData.acknowledgmentMessage}
                onChange={(e) => handleChange(e, "acknowledgmentMessage")}
                className="border-gray-300 min-h-[120px]"
                disabled={shouldDisableInputs}
              />
            </div>
          </section>

          {/* Success message */}
          {saveSuccess && (
            <Alert className="bg-green-50 border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="ml-2 text-green-700">
                Donation settings updated successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Submit button */}
          <div className="flex justify-end">
            <Button
              className="bg-[#1CAC78] hover:bg-[#158f63] flex items-center gap-2 px-6"
              onClick={handleSave}
              disabled={shouldDisableInputs || isSaving}
              title={shouldDisableInputs ? pendingTitle : ""}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <BanknoteIcon className="h-4 w-4" />
                  <span>Save Payment Settings</span>
                </>
              )}
            </Button>
          </div>

          {/* Contract operation status */}
          {contractWriteStatus === "pending" && (
            <Alert className="bg-blue-50 border-blue-200 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <AlertDescription className="ml-2 text-blue-700">
                Creating your NGO contract on the blockchain. This may take a
                few minutes...
              </AlertDescription>
            </Alert>
          )}

          {contractWriteStatus === "success" && hash && (
            <Alert className="bg-green-50 border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-green-700 font-medium">
                  Contract created successfully!
                </p>
                <p className="text-xs text-green-600 font-mono mt-1 break-all">
                  Transaction: {hash}
                </p>
              </div>
            </Alert>
          )}

          {contractWriteStatus === "error" && (
            <Alert className="bg-red-50 border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="ml-2 text-red-700">
                Failed to create contract. Please try again or contact support.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DonationInformation;
