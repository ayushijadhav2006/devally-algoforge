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
    args: [walletAddress],
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
          setDonationsData(docSnap.data().donationsData);
        }
      } catch (error) {
        toast.error("Failed to load donation settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDonationData();
  }, [ngoId]);

  // Update cryptoWalletAddress when wallet connection changes
  useEffect(() => {
    if (!isConnected) {
      setDonationsData((prev) => ({
        ...prev,
        cryptoWalletAddress: "",
      }));
    } else {
      setDonationsData((prev) => ({
        ...prev,
        cryptoWalletAddress: walletAddress,
      }));
    }
  }, [walletAddress, isConnected]);

  // Update contract address in Firestore when it changes
  useEffect(() => {
    const updateContractAddress = async () => {
      if (!ngoId || !formattedNgoOwnerContract) return;

      try {
        // Get current Firestore data
        const docRef = doc(db, "ngo", ngoId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const firestoreContractAddress =
            docSnap.data()?.donationsData?.ngoOwnerAddContract;

          // Check if addresses differ and it's not a zero-address-to-null case
          const isZeroAddressCase =
            ngoOwnerAddContract ===
              "0x0000000000000000000000000000000000000000" &&
            firestoreContractAddress === null;

          if (
            firestoreContractAddress !== formattedNgoOwnerContract &&
            !isZeroAddressCase
          ) {
            await updateDoc(docRef, {
              "donationsData.ngoOwnerAddContract": formattedNgoOwnerContract,
            });
            toast.success("Wallet contract updated successfully");
          }
        }
      } catch (error) {
        toast.error("Failed to update contract address");
      }
    };

    // Run check whenever contract addresses change
    if (ngoOwnerAddContract !== undefined) {
      updateContractAddress();
    }
  }, [ngoOwnerAddContract, formattedNgoOwnerContract, ngoId]);

  const addNgoInContract = async () => {
    try {
      await writeContract({
        address: "0xBe1cC0D67244B29B903848EF52530538830bD6d7",
        abi: SuperAdminABI,
        functionName: "createNGO",
        args: [walletAddress, "0xAbFb2AeF4aAC335Cda2CeD2ddd8A6521047e8ddF"],
      });

      toast.success("NGO contract creation initiated");
      return true;
    } catch (error) {
      toast.error("Failed to create NGO contract");
      return false;
    }
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

    // Only check for wallet connection if crypto transfers are enabled
    if (donationsData.isCryptoTransferEnabled && !isConnected) {
      toast.error("Please connect your wallet to enable crypto transfers.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      let updatedDonationsData = { ...donationsData };

      // Handle crypto-related data based on whether it's enabled
      if (updatedDonationsData.isCryptoTransferEnabled) {
        // Only attempt contract creation if crypto is enabled
        if (!formattedNgoOwnerContract) {
          const success = await addNgoInContract();
          if (!success) {
            setIsSaving(false);
            return;
          }
          // Wait for transaction to be mined before proceeding
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Add delay to allow contract creation
        }

        // Add wallet and contract addresses when crypto is enabled
        updatedDonationsData = {
          ...updatedDonationsData,
          ngoOwnerAdd: walletAddress,
          ngoOwnerAddContract: formattedNgoOwnerContract,
        };
      } else {
        // If crypto is disabled, remove related fields
        updatedDonationsData.cryptoWalletAddress = null;
        updatedDonationsData.ngoOwnerAdd = null;
        updatedDonationsData.ngoOwnerAddContract = null;
      }

      await updateDoc(doc(db, "ngo", ngoId), {
        donationsData: updatedDonationsData,
      });

      toast.success("Donation settings updated successfully!");
      setSaveSuccess(true);

      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      toast.error("Failed to update donation settings.");
    } finally {
      setIsSaving(false);
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
                    <RequiredLabel>Connect Wallet</RequiredLabel>
                    <p className="text-sm text-gray-600 mb-3">
                      Connect your Ethereum wallet to receive crypto donations.
                      This will create a smart contract for your organization.
                    </p>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                      <div className="w-fit">
                        <ConnectButton />
                      </div>

                      {isConnected && (
                        <div className="flex items-center px-3 py-2 bg-blue-50 rounded-md text-blue-700 border border-blue-200 max-w-md break-all">
                          <p className="text-sm font-mono">{walletAddress}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {isConnected && formattedNgoOwnerContract && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                        <span className="font-medium text-green-800">
                          Contract Deployed
                        </span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Your donation contract has been deployed successfully.
                      </p>
                      <div className="mt-2 px-3 py-2 bg-white rounded border border-green-200">
                        <p className="text-xs font-mono text-green-700 break-all">
                          {formattedNgoOwnerContract}
                        </p>
                      </div>
                    </div>
                  )}

                  {isConnected && !formattedNgoOwnerContract && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                      <p className="text-sm text-yellow-700">
                        No contract deployed yet. Save your settings to create a
                        contract.
                      </p>
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

          {isPending && (
            <Alert className="bg-blue-50 border-blue-200 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <AlertDescription className="ml-2 text-blue-700">
                Blockchain transaction in progress...
              </AlertDescription>
            </Alert>
          )}

          {hash && (
            <Alert className="bg-green-50 border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-green-700 font-medium">
                  Transaction Successful
                </p>
                <p className="text-xs text-green-600 font-mono mt-1 break-all">
                  {hash}
                </p>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DonationInformation;
