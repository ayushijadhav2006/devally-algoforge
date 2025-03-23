"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Lock,
  AlertCircle,
  CheckCircle,
  Mail,
  X,
  Shield,
  Smartphone,
  Key,
  Info,
  QrCode,
  Copy,
  Plus,
  Eye,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  sendEmailVerification,
  signInWithEmailAndPassword,
  getMultiFactorResolver,
  sendPasswordResetEmail,
} from "firebase/auth";
import toast from "react-hot-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
// Import the otplib for TOTP 2FA
import { authenticator } from "otplib";
// Import QRCode for TOTP setup
import { useQRCode } from "next-qrcode";

const SecurityComponent = ({ role = "user" }) => {
  // Use the QR code hook
  const { Canvas } = useQRCode();

  // Password reset states
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState("");
  const [passwordResetError, setPasswordResetError] = useState("");

  // Re-authentication modal states
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthEmail, setReauthEmail] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [reauthError, setReauthError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  // Email verification states
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // 2FA states
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [step2FA, setStep2FA] = useState("initial"); // initial, method, phone, totp, verification, complete
  const [authMethod, setAuthMethod] = useState("phone"); // "phone" or "totp"

  // TOTP states
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // MFA verification states
  const [showMFAVerificationModal, setShowMFAVerificationModal] =
    useState(false);
  const [mfaVerificationCode, setMFAVerificationCode] = useState("");
  const [isMFAVerifying, setIsMFAVerifying] = useState(false);
  const [mfaResolver, setMFAResolver] = useState(null);
  const [mfaError, setMFAError] = useState("");
  const [mfaVerificationId, setMfaVerificationId] = useState("");

  // Reference to store the recaptcha verifier instance
  const recaptchaVerifierRef = useRef(null);
  // Reference to the recaptcha container
  const recaptchaContainerRef = useRef(null);

  const auth = getAuth();
  const user = auth.currentUser;

  // Check if 2FA is already enabled and email verification status
  useEffect(() => {
    if (user) {
      const multiFactorUser = multiFactor(user);
      setIs2FAEnabled(multiFactorUser.enrolledFactors.length > 0);
      setEmailVerified(user.emailVerified);
      setReauthEmail(user.email || "");
    }
  }, [user]);

  // Clean up reCAPTCHA when component unmounts or when step changes
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // Reset reCAPTCHA when step changes
  useEffect(() => {
    if (step2FA !== "phone" && recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear();
      recaptchaVerifierRef.current = null;
    }
  }, [step2FA]);

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!user || !user.email) {
      toast.error("No user email found");
      return;
    }

    setIsResettingPassword(true);
    setPasswordResetError("");
    setPasswordResetSuccess("");

    try {
      await sendPasswordResetEmail(auth, user.email);
      setPasswordResetSuccess(
        "Password reset email sent! Please check your inbox."
      );
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      setPasswordResetError(
        error.message || "Failed to send password reset email"
      );
      toast.error(error.message || "Failed to send password reset email");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleReauthenticate = async () => {
    setReauthError("");
    setIsReauthenticating(true);

    try {
      if (!reauthEmail || !reauthPassword) {
        throw new Error("Email and password are required");
      }

      try {
        // Re-authenticate the user
        const credential = EmailAuthProvider.credential(
          reauthEmail,
          reauthPassword
        );
        await reauthenticateWithCredential(user, credential);

        // Close the modal
        setShowReauthModal(false);
        setReauthPassword("");

        // Execute the pending action
        if (pendingAction === "enable2FA") {
          initiate2FA();
        } else if (pendingAction === "disable2FA") {
          await disable2FA();
        }

        // Clear the pending action
        setPendingAction(null);
      } catch (error) {
        // Check if this is a multi-factor auth required error
        if (error.code === "auth/multi-factor-auth-required") {
          try {
            // Get the resolver
            const resolver = getMultiFactorResolver(auth, error);
            setMFAResolver(resolver);

            // We need to create a new RecaptchaVerifier for each MFA attempt
            if (recaptchaVerifierRef.current) {
              recaptchaVerifierRef.current.clear();
              recaptchaVerifierRef.current = null;
            }

            // Create a new RecaptchaVerifier
            recaptchaVerifierRef.current = new RecaptchaVerifier(
              auth,
              "recaptcha-container",
              {
                size: "invisible",
                callback: () => {
                  console.log("reCAPTCHA solved");
                },
              }
            );

            // Get the first hint (usually there's only one)
            const hint = resolver.hints[0];

            // Get the phone auth provider
            const phoneAuthProvider = new PhoneAuthProvider(auth);

            // Send verification code to the user's phone
            const verificationId = await phoneAuthProvider.verifyPhoneNumber(
              {
                multiFactorHint: hint,
                session: resolver.session,
              },
              recaptchaVerifierRef.current
            );

            // Store the verification ID
            setMfaVerificationId(verificationId);

            // Show MFA verification modal
            setShowMFAVerificationModal(true);
            setShowReauthModal(false); // Hide the reauthentication modal

            toast.success("Verification code sent to your phone");
          } catch (mfaError) {
            console.error("Error setting up MFA verification:", mfaError);
            setReauthError(mfaError.message || "Failed to set up verification");
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Re-authentication error:", error);

      if (error.code === "auth/wrong-password") {
        setReauthError("Incorrect password");
      } else if (error.code === "auth/too-many-requests") {
        setReauthError("Too many attempts. Please try again later");
      } else if (error.code === "auth/user-mismatch") {
        setReauthError(
          "The provided credentials do not match the current user"
        );
      } else {
        setReauthError(error.message || "Failed to re-authenticate");
      }
    } finally {
      setIsReauthenticating(false);
    }
  };

  const sendVerificationEmail = async () => {
    if (!user) {
      toast.error("You must be logged in to verify your email");
      return;
    }

    setIsSendingVerification(true);
    try {
      await sendEmailVerification(user);
      toast.success("Verification email sent! Please check your inbox.");
    } catch (error) {
      console.error("Error sending verification email:", error);

      if (error.code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please try again later.");
      } else {
        toast.error(error.message || "Failed to send verification email");
      }
    } finally {
      setIsSendingVerification(false);
    }
  };

  // Refresh email verification status
  const checkEmailVerification = async () => {
    if (!user) return;

    try {
      // Reload the user to get the latest emailVerified status
      await user.reload();
      setEmailVerified(user.emailVerified);

      if (user.emailVerified) {
        toast.success("Your email has been verified!");
      }
    } catch (error) {
      console.error("Error checking email verification status:", error);
    }
  };

  const initiate2FA = async () => {
    try {
      if (!user) {
        throw new Error("You must be logged in to enable 2FA");
      }

      setStep2FA("method");
    } catch (error) {
      if (error.code === "auth/requires-recent-login") {
        // Show re-authentication modal
        setPendingAction("enable2FA");
        setShowReauthModal(true);
      } else {
        toast.error(error.message || "Failed to start 2FA setup");
      }
    }
  };

  const setupRecaptcha = () => {
    // Clear any existing reCAPTCHA instance
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear();
      recaptchaVerifierRef.current = null;
    }

    // Make sure the container exists
    if (!recaptchaContainerRef.current) {
      toast.error("reCAPTCHA container not found");
      return false;
    }

    try {
      // Create a new reCAPTCHA verifier
      recaptchaVerifierRef.current = new RecaptchaVerifier(
        auth,
        recaptchaContainerRef.current,
        {
          size: "normal",
          callback: () => {
            // reCAPTCHA solved, allow sending verification code
            console.log("reCAPTCHA verified");
          },
          "expired-callback": () => {
            // Reset reCAPTCHA
            toast.error("reCAPTCHA expired. Please try again.");
            if (recaptchaVerifierRef.current) {
              recaptchaVerifierRef.current.clear();
              recaptchaVerifierRef.current = null;
              setupRecaptcha(); // Recreate it
            }
          },
        }
      );

      // Render the reCAPTCHA
      recaptchaVerifierRef.current.render();
      return true;
    } catch (error) {
      console.error("Error setting up reCAPTCHA:", error);
      toast.error("Failed to set up verification. Please try again.");
      return false;
    }
  };

  const sendVerificationCode = async () => {
    try {
      if (!phoneNumber || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
        throw new Error(
          "Please enter a valid phone number with country code (e.g., +1234567890)"
        );
      }

      setIsEnabling2FA(true);

      if (!user) {
        throw new Error("You must be logged in to enable 2FA");
      }

      // Setup reCAPTCHA
      const recaptchaSetup = setupRecaptcha();
      if (!recaptchaSetup) {
        throw new Error("Failed to set up reCAPTCHA verification");
      }

      // Get multiFactor session
      const multiFactorUser = multiFactor(user);
      const multiFactorSession = await multiFactorUser.getSession();

      // Send verification code
      const phoneInfoOptions = {
        phoneNumber: phoneNumber,
        session: multiFactorSession,
      };

      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions,
        recaptchaVerifierRef.current
      );

      setVerificationId(verificationId);
      setStep2FA("verification");
      toast.success("Verification code sent to your phone");
    } catch (error) {
      console.error("Error sending verification code:", error);

      if (error.code === "auth/requires-recent-login") {
        // Show re-authentication modal
        setPendingAction("enable2FA");
        setShowReauthModal(true);
      } else {
        toast.error(error.message || "Failed to send verification code");
      }
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const verifyAndEnroll = async () => {
    try {
      if (authMethod === "phone") {
        // Phone verification logic (existing)
        if (!verificationCode || verificationCode.length < 6) {
          throw new Error("Please enter a valid verification code");
        }

        setIsEnabling2FA(true);

        if (!user) {
          throw new Error("You must be logged in to enable 2FA");
        }

        // Create credential
        const cred = PhoneAuthProvider.credential(
          verificationId,
          verificationCode
        );
        const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);

        // Enroll the second factor
        const multiFactorUser = multiFactor(user);
        await multiFactorUser.enroll(multiFactorAssertion, "Phone Number");

        // Update user document to reflect 2FA status
        if (user.uid) {
          const userDocRef = doc(db, role === "ngo" ? "ngo" : "users", user.uid);
          await updateDoc(userDocRef, {
            is2FAEnabled: true,
            phoneFor2FA: phoneNumber,
            mfaType: "phone"
          });
        }
      } else if (authMethod === "totp") {
        // TOTP verification logic
        if (!verificationCode || verificationCode.length < 6) {
          throw new Error("Please enter a valid verification code");
        }

        setIsEnabling2FA(true);

        if (!user) {
          throw new Error("You must be logged in to enable 2FA");
        }

        // Verify the TOTP code
        const isValid = authenticator.check(verificationCode, totpSecret);

        if (!isValid) {
          throw new Error("Invalid verification code. Please try again.");
        }

        // Update user document to store TOTP secret (encrypted in a real app)
        if (user.uid) {
          const userDocRef = doc(db, role === "ngo" ? "ngo" : "users", user.uid);
          await updateDoc(userDocRef, {
            is2FAEnabled: true,
            totpSecret: totpSecret, // In production, encrypt this value
            mfaType: "totp"
          });
        }
      }

      setIs2FAEnabled(true);
      setStep2FA("complete");
      toast.success("Two-factor authentication enabled successfully!");
    } catch (error) {
      console.error("Error verifying code:", error);

      if (error.code === "auth/requires-recent-login") {
        // Show re-authentication modal
        setPendingAction("enable2FA");
        setShowReauthModal(true);
        setStep2FA("initial"); // Reset the step
      } else {
        toast.error(error.message || "Failed to verify code");
      }
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const disable2FA = async () => {
    try {
      setIsEnabling2FA(true);

      if (!user) {
        throw new Error("You must be logged in to disable 2FA");
      }

      const multiFactorUser = multiFactor(user);

      if (multiFactorUser.enrolledFactors.length > 0) {
        // Unenroll the first enrolled factor (usually there's only one)
        await multiFactorUser.unenroll(multiFactorUser.enrolledFactors[0]);

        // Update user document to reflect 2FA status
        if (user.uid) {
          const userDocRef = doc(
            db,
            role === "ngo" ? "ngo" : "users",
            user.uid
          );
          await updateDoc(userDocRef, {
            is2FAEnabled: false,
            phoneFor2FA: null,
            totpSecret: null,
            mfaType: null
          });
        }

        setIs2FAEnabled(false);
        setStep2FA("initial");
        toast.success("Two-factor authentication disabled successfully!");
      }
    } catch (error) {
      console.error("Error disabling 2FA:", error);

      if (error.code === "auth/requires-recent-login") {
        // Show re-authentication modal
        setPendingAction("disable2FA");
        setShowReauthModal(true);
      } else {
        toast.error(error.message || "Failed to disable 2FA");
      }
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handle2FAToggle = () => {
    if (is2FAEnabled) {
      disable2FA();
    } else {
      initiate2FA();
    }
  };

  // TOTP Setup Functions
  const setupTOTP = () => {
    try {
      // Generate a random secret key
      const secret = authenticator.generateSecret();
      setTotpSecret(secret);

      // Generate the URI for the QR code
      const uri = authenticator.keyuri(
        user.email || "user",
        "DevAlly App",
        secret
      );
      setTotpUri(uri);

      // Proceed to the TOTP verification step
      setStep2FA("totp");
    } catch (error) {
      console.error("Error setting up TOTP:", error);
      toast.error("Failed to set up authenticator app: " + error.message);
    }
  };

  const copySecretToClipboard = () => {
    navigator.clipboard.writeText(totpSecret)
      .then(() => {
        setIsCopied(true);
        toast.success("Secret key copied to clipboard");
        setTimeout(() => setIsCopied(false), 3000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        toast.error("Failed to copy secret key");
      });
  };

  // Handle MFA verification
  const handleMFAVerification = async () => {
    setMFAError("");
    setIsMFAVerifying(true);

    try {
      if (!mfaVerificationCode || mfaVerificationCode.length < 6) {
        throw new Error("Please enter a valid verification code");
      }

      if (!mfaResolver) {
        throw new Error("MFA resolver not found");
      }

      // Check if this is a TOTP verification or phone verification
      const userDocRef = doc(db, role === "ngo" ? "ngo" : "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      if (userData.mfaType === "totp" && userData.totpSecret) {
        // TOTP verification
        const isValid = authenticator.check(mfaVerificationCode, userData.totpSecret);

        if (!isValid) {
          throw new Error("Invalid verification code. Please try again.");
        }

        // Complete the sign-in
        await signInWithEmailAndPassword(auth, reauthEmail, reauthPassword);
        
        setShowMFAVerificationModal(false);
        // Execute the pending action if there was one
        if (pendingAction === "enable2FA") {
          initiate2FA();
        } else if (pendingAction === "disable2FA") {
          await disable2FA();
        }
        setPendingAction(null);
      } else {
        // Phone-based verification
        if (!mfaVerificationId) {
          throw new Error("Verification ID not found. Please try again.");
        }

        try {
          // Create a PhoneAuthCredential with the verification ID and code
          const credential = PhoneAuthProvider.credential(
            mfaVerificationId,
            mfaVerificationCode
          );

          // Create a multi-factor assertion
          const multiFactorAssertion =
            PhoneMultiFactorGenerator.assertion(credential);

          // Complete sign-in
          await mfaResolver.resolveSignIn(multiFactorAssertion);

          setShowMFAVerificationModal(false);

          // Execute the pending action if there was one
          if (pendingAction === "enable2FA") {
            initiate2FA();
          } else if (pendingAction === "disable2FA") {
            await disable2FA();
          }
          setPendingAction(null);
        } catch (error) {
          console.error("Error resolving MFA sign-in:", error);
          if (error.code === "auth/invalid-verification-code") {
            setMFAError("Invalid verification code. Please try again.");
          } else if (error.code === "auth/argument-error") {
            setMFAError(
              "Invalid verification information. Please try again from the beginning."
            );
            // Reset the MFA flow
            setTimeout(() => {
              setShowMFAVerificationModal(false);
              setPendingAction(null);
              setMfaVerificationId("");
              setMFAVerificationCode("");
              if (recaptchaVerifierRef.current) {
                recaptchaVerifierRef.current.clear();
                recaptchaVerifierRef.current = null;
              }
            }, 3000);
          } else {
            setMFAError(error.message || "Failed to verify code");
          }
          throw error;
        }
      }
    } catch (error) {
      console.error("MFA verification error:", error);
      setMFAError(error.message || "Failed to verify code");
    } finally {
      setIsMFAVerifying(false);
    }
  };

  return (
    <div className=" mx-auto">
      <Card className="shadow-md border-0 overflow-hidden">
        <CardHeader className=" pb-6">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6" />
            <CardTitle className="text-xl">
              Security & Privacy Settings
            </CardTitle>
          </div>
          <p className="mt-2 text-sm">
            Manage your account security settings, email verification, and
            two-factor authentication.
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {/* Email Verification Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-full">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium">Email Verification</h3>
            </div>

            {user && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                  <div
                    className={`p-2 rounded-full ${
                      emailVerified ? "bg-green-100" : "bg-yellow-100"
                    }`}
                  >
                    <CheckCircle
                      className={`h-5 w-5 ${
                        emailVerified ? "text-green-500" : "text-yellow-500"
                      }`}
                    />
                  </div>
                  <span className="font-medium">
                    {emailVerified
                      ? `Your email (${user.email}) is verified`
                      : `Your email (${user.email}) is not verified`}
                  </span>
                </div>

                {!emailVerified && (
                  <div className="space-y-3">
                    <Alert className="bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-700 ml-2">
                        Please verify your email address to enhance your account
                        security.
                      </AlertDescription>
                    </Alert>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <Button
                        variant="outline"
                        className="flex items-center space-x-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                        onClick={sendVerificationEmail}
                        disabled={isSendingVerification}
                      >
                        <Mail className="h-4 w-4" />
                        <span>
                          {isSendingVerification
                            ? "Sending..."
                            : "Send Verification Email"}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={checkEmailVerification}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        I've verified my email
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Password Reset Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-violet-50 rounded-full">
                <Key className="h-5 w-5 text-violet-500" />
              </div>
              <h3 className="text-lg font-medium">Password Reset</h3>
            </div>

            {passwordResetError && (
              <Alert variant="destructive" className="mb-4 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="ml-2 font-semibold">Error</AlertTitle>
                <AlertDescription className="ml-2">
                  {passwordResetError}
                </AlertDescription>
              </Alert>
            )}

            {passwordResetSuccess && (
              <Alert className="mb-4 bg-green-50 border-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle className="ml-2 text-green-700 font-semibold">
                  Success
                </AlertTitle>
                <AlertDescription className="ml-2 text-green-700">
                  {passwordResetSuccess}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                <Info className="h-5 w-5 text-gray-500 mt-0.5" />
                <p className="text-sm text-gray-600">
                  Click the button below to receive a password reset link via
                  email. The link will allow you to set a new password.
                </p>
              </div>

              <Button
                className="w-full sm:w-auto bg-[#1CAC78] hover:bg-[#158f63] flex items-center space-x-2"
                onClick={handlePasswordReset}
                disabled={isResettingPassword || !emailVerified}
              >
                <Mail className="h-4 w-4" />
                <span>
                  {isResettingPassword ? "Sending..." : "Reset Password"}
                </span>
              </Button>

              {!emailVerified && (
                <Alert className="mt-2 bg-yellow-50 border-yellow-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="ml-2 text-yellow-700">
                    You need to verify your email before you can reset your
                    password.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </section>

          {/* 2FA Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-emerald-50 rounded-full">
                <Smartphone className="h-5 w-5 text-emerald-500" />
              </div>
              <h3 className="text-lg font-medium">
                Two-Factor Authentication (2FA)
              </h3>
            </div>

            <div className="flex items-center p-4 bg-gray-50 rounded-lg mb-4">
              <Switch
                id="two-factor-auth"
                className="data-[state=checked]:bg-[#1CAC78]"
                checked={is2FAEnabled}
                onCheckedChange={handle2FAToggle}
                disabled={
                  isEnabling2FA ||
                  (step2FA !== "initial" && step2FA !== "complete") ||
                  !emailVerified
                }
              />
              <Label htmlFor="two-factor-auth" className="ml-3 font-medium">
                {is2FAEnabled
                  ? "Two-Factor Authentication is Enabled"
                  : "Enable Two-Factor Authentication (2FA)"}
              </Label>
            </div>

            {!emailVerified && (
              <Alert className="mb-4 bg-yellow-50 border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="ml-2 text-yellow-700">
                  You need to verify your email before you can enable two-factor
                  authentication.
                </AlertDescription>
              </Alert>
            )}

            {/* 2FA Method Selection */}
            {step2FA === "method" && (
              <div className="space-y-4 p-5 border rounded-lg bg-gray-50 border-gray-200">
                <h4 className="font-medium text-gray-700">
                  Choose Authentication Method
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors
                      ${authMethod === "phone" ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}
                    onClick={() => setAuthMethod("phone")}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Smartphone className="h-5 w-5 text-blue-500" />
                      <h5 className="font-medium">SMS Authentication</h5>
                    </div>
                    <p className="text-sm text-gray-600">
                      Receive verification codes via SMS on your phone.
                    </p>
                  </div>
                  
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-colors
                      ${authMethod === "totp" ? "border-purple-500 bg-purple-50" : "border-gray-200 bg-white"}`}
                    onClick={() => setAuthMethod("totp")}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <QrCode className="h-5 w-5 text-purple-500" />
                      <h5 className="font-medium">Authenticator App</h5>
                    </div>
                    <p className="text-sm text-gray-600">
                      Use an authenticator app like Google Authenticator or Authy.
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 mt-4">
                  <Button
                    onClick={() => authMethod === "phone" ? setStep2FA("phone") : setupTOTP()}
                    className="bg-[#1CAC78] hover:bg-[#158f63]"
                  >
                    Continue with {authMethod === "phone" ? "SMS" : "Authenticator App"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStep2FA("initial")}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Phone Authentication */}
            {step2FA === "phone" && (
              <div className="space-y-4 p-5 border rounded-lg bg-gray-50 border-gray-200">
                <h4 className="font-medium text-gray-700">Set Up Your Phone</h4>
                <div className="space-y-2">
                  <Label htmlFor="phone-number" className="text-sm">
                    Enter your phone number with country code
                  </Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    placeholder="+1234567890"
                    className="border-gray-300 bg-white"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div
                  className="recaptcha-container mt-3"
                  ref={recaptchaContainerRef}
                ></div>
                <div className="flex flex-wrap gap-3 mt-2">
                  <Button
                    onClick={sendVerificationCode}
                    disabled={isEnabling2FA}
                    className="bg-[#1CAC78] hover:bg-[#158f63]"
                  >
                    {isEnabling2FA ? "Sending..." : "Send Verification Code"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStep2FA("method")}
                    disabled={isEnabling2FA}
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* TOTP Setup */}
            {step2FA === "totp" && (
              <div className="space-y-4 p-5 border rounded-lg bg-gray-50 border-gray-200">
                <h4 className="font-medium text-gray-700">
                  Set Up Authenticator App
                </h4>
                <div className="space-y-4">
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Install an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator</li>
                    <li>Scan the QR code below with your authenticator app</li>
                    <li>Enter the 6-digit verification code from the app</li>
                  </ol>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center">
                    {totpUri && (
                      <div className="mb-4 p-2 bg-white rounded-lg border border-gray-200 inline-flex">
                        <Canvas
                          text={totpUri}
                          options={{
                            level: 'M',
                            margin: 3,
                            scale: 4,
                            width: 200,
                            color: {
                              dark: '#000000',
                              light: '#FFFFFF',
                            },
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="mt-2 w-full">
                      <p className="text-xs text-gray-500 mb-1">
                        If you can't scan the QR code, enter this secret key manually:
                      </p>
                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <Input
                            type={showSecretKey ? "text" : "password"}
                            value={totpSecret}
                            readOnly
                            className="pr-10 font-mono text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-700"
                            onClick={() => setShowSecretKey(!showSecretKey)}
                          >
                            {showSecretKey ? <X size={16} /> : <Eye size={16} />}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={copySecretToClipboard}
                          className={isCopied ? "bg-green-50 text-green-600 border-green-200" : ""}
                        >
                          {isCopied ? (
                            <><CheckCircle size={16} className="mr-1" /> Copied</>
                          ) : (
                            <><Copy size={16} className="mr-1" /> Copy</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="verification-code" className="text-sm">
                      Enter the 6-digit verification code from your authenticator app
                    </Label>
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="123456"
                      className="border-gray-300 bg-white"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  <Button
                    onClick={verifyAndEnroll}
                    disabled={isEnabling2FA}
                    className="bg-[#1CAC78] hover:bg-[#158f63]"
                  >
                    {isEnabling2FA ? "Verifying..." : "Verify and Enable 2FA"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStep2FA("method")}
                    disabled={isEnabling2FA}
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* Common verification step for both methods */}
            {step2FA === "verification" && authMethod === "phone" && (
              <div className="space-y-4 p-5 border rounded-lg bg-gray-50 border-gray-200">
                <h4 className="font-medium text-gray-700">Verify Your Phone</h4>
                <div className="space-y-2">
                  <Label htmlFor="verification-code" className="text-sm">
                    Enter the verification code sent to your phone
                  </Label>
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="123456"
                    className="border-gray-300 bg-white"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  <Button
                    onClick={verifyAndEnroll}
                    disabled={isEnabling2FA}
                    className="bg-[#1CAC78] hover:bg-[#158f63]"
                  >
                    {isEnabling2FA ? "Verifying..." : "Verify and Enable 2FA"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStep2FA("phone")}
                    disabled={isEnabling2FA}
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}

            {is2FAEnabled && (
              <Alert className="bg-blue-50 border-blue-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="ml-2 text-blue-700">
                  Your account is protected with two-factor authentication.
                  You'll need to provide a verification code when signing in.
                </AlertDescription>
              </Alert>
            )}
          </section>

          {/* Access Logs Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-full">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium">Data Access & Privacy</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              View logs of when and how your account data has been accessed.
            </p>

            <Button
              variant="outline"
              className="border-gray-300 hover:bg-gray-50"
            >
              <Lock className="mr-2 h-4 w-4" /> View Access Logs
            </Button>
          </section>
        </CardContent>
      </Card>

      {/* Re-authentication Modal */}
      <Dialog open={showReauthModal} onOpenChange={setShowReauthModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl">
              Re-authenticate Required
            </DialogTitle>
            <DialogDescription className="mt-2 text-gray-600">
              For security reasons, please re-enter your password to continue.
            </DialogDescription>
          </DialogHeader>

          {reauthError && (
            <Alert variant="destructive" className="mt-2 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {reauthError}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reauth-email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="reauth-email"
                value={reauthEmail}
                onChange={(e) => setReauthEmail(e.target.value)}
                disabled={!!user?.email}
                className="bg-gray-50 disabled:opacity-70"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reauth-password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="reauth-password"
                type="password"
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                placeholder="Enter your password"
                className="border-gray-300"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowReauthModal(false);
                setPendingAction(null);
              }}
              disabled={isReauthenticating}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReauthenticate}
              disabled={isReauthenticating}
              className="bg-[#1CAC78] hover:bg-[#158f63]"
            >
              {isReauthenticating ? "Authenticating..." : "Authenticate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MFA Verification Modal */}
      <Dialog
        open={showMFAVerificationModal}
        onOpenChange={setShowMFAVerificationModal}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl">
              Two-Factor Authentication
            </DialogTitle>
            <DialogDescription className="mt-2 text-gray-600">
              Please enter the verification code sent to your phone.
            </DialogDescription>
          </DialogHeader>

          {mfaError && (
            <Alert variant="destructive" className="mt-2 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">{mfaError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="mfa-code" className="text-sm font-medium">
                Verification Code
              </Label>
              <Input
                id="mfa-code"
                type="text"
                value={mfaVerificationCode}
                onChange={(e) => setMFAVerificationCode(e.target.value)}
                placeholder="Enter the 6-digit code"
                className="border-gray-300 text-center font-medium text-lg tracking-widest"
              />
            </div>
            {/* Hidden recaptcha container for MFA verification */}
            <div id="recaptcha-container" style={{ display: "none" }}></div>
          </div>

          <DialogFooter className="border-t pt-4 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowMFAVerificationModal(false);
                setPendingAction(null);
                setMfaVerificationId("");
                setMFAVerificationCode("");
                if (recaptchaVerifierRef.current) {
                  recaptchaVerifierRef.current.clear();
                  recaptchaVerifierRef.current = null;
                }
              }}
              disabled={isMFAVerifying}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMFAVerification}
              disabled={isMFAVerifying}
              className="bg-[#1CAC78] hover:bg-[#158f63]"
            >
              {isMFAVerifying ? "Verifying..." : "Verify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SecurityComponent;
