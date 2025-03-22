"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Upload,
  X,
  MapPin,
  Building,
  Briefcase,
  FileText,
  Info,
  Globe,
  Phone,
  Mail,
  Hash,
  Type,
  Target,
  Eye,
  Users,
  Loader2,
  CheckCircle,
  AlertCircle,
  SaveIcon,
} from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
} from "firebase/storage";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LocationDialog from "./LocationDialog";

const ProfileInformation = ({ userId, approvalStatus, verificationStatus }) => {
  const [ngoProfile, setNgoProfile] = useState({
    ngoName: "",
    name: "",
    registrationNumber: "",
    description: "",
    phone: "",
    type: "",
    customType: "",
    categories: [],
    email: "",
    website: "",
    pan: "",
    address: "",
    location: null,
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    logoUrl: "",
    logoFile: null,
    mission: "",
    vision: "",
    state: "",
    district: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomType, setShowCustomType] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Memoize NGO types and categories to prevent recreation on each render
  const ngoTypesAndCategories = useMemo(
    () => ({
      "Child Welfare Organizations": [
        "Foster Care Programs",
        "Early Childhood Development (ECD)",
        "Holistic Child Rehabilitation",
        "Vulnerable Child Protection Initiatives",
      ],
      "Environmental Conservation Organizations": [
        "Sustainable Development Programs",
        "Climate Resilience & Adaptation Strategies",
        "Biodiversity & Ecosystem Conservation",
        "Renewable Energy Advocacy",
      ],
      "Public Health & Medical Relief Organizations": [
        "Epidemic & Pandemic Preparedness",
        "Maternal & Child Health (MCH) Programs",
        "Disease Prevention & Control Campaigns",
        "Mental Health & Psychosocial Support (MHPSS)",
      ],
      "Educational Empowerment Organizations": [
        "Literacy & Numeracy Enhancement Programs",
        "Inclusive & Equitable Education Initiatives",
        "Digital & Technological Skill-building",
        "Vocational & Workforce Readiness Programs",
      ],
      Other: [],
    }),
    []
  );

  // Memoize computed values
  const shouldDisableInputs = useMemo(
    () =>
      (verificationStatus === "verified" && approvalStatus === "verified") ||
      (verificationStatus === "pending" && approvalStatus === "pending") ||
      isSubmitting,
    [verificationStatus, approvalStatus, isSubmitting]
  );

  const pendingTitle =
    "You cannot update the profile while the verification is in progress";

  // Use useCallback for event handlers to prevent recreation on each render
  const handleInputChange = useCallback((field, value) => {
    setNgoProfile((prevProfile) => ({
      ...prevProfile,
      [field]: value,
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [field]: undefined,
    }));
  }, []);

  const handleTypeChange = useCallback(
    (value) => {
      setShowCustomType(value === "Other");

      setNgoProfile((prevProfile) => {
        const updatedProfile = {
          ...prevProfile,
          type: value,
          customType: value === "Other" ? prevProfile.customType : "",
        };

        if (value !== "Other") {
          updatedProfile.categories = [...ngoTypesAndCategories[value]];
          updatedProfile.customCategory = "";
        } else {
          updatedProfile.categories = prevProfile.categories;
        }

        return updatedProfile;
      });

      setErrors((prevErrors) => ({
        ...prevErrors,
        type: undefined,
      }));
    },
    [ngoTypesAndCategories]
  );

  const handleCustomCategoryChange = useCallback((value) => {
    setNgoProfile((prevProfile) => ({
      ...prevProfile,
      customCategory: value,
      categories: value ? [value] : [],
    }));

    setErrors((prevErrors) => ({
      ...prevErrors,
      customCategory: undefined,
    }));
  }, []);

  const handleLogoUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          logoFile: "Logo file must be less than 2MB",
        }));
        return;
      }

      // Validate file type
      if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          logoFile: "Only JPG and PNG formats are allowed",
        }));
        return;
      }

      const fileURL = URL.createObjectURL(file);
      setNgoProfile((prev) => ({
        ...prev,
        logoUrl: fileURL,
        logoFile: file,
      }));

      setErrors((prev) => ({
        ...prev,
        logoFile: undefined,
      }));
    }
  }, []);

  // Fetch NGO profile data - optimized to use getDoc instead of onSnapshot for one-time load
  useEffect(() => {
    const fetchNGOProfile = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, "ngo", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setNgoProfile((prevProfile) => ({
            ...prevProfile,
            ...data,
            categories:
              data.categories || (data.category ? [data.category] : []),
          }));

          setShowCustomType(data.type === "Other");
        }
      } catch (error) {
        toast.error("Failed to load profile information");
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNGOProfile();
  }, [userId]);

  // Improved validation with more specific error messages
  const validateInputs = useCallback(() => {
    const newErrors = {};
    if (!ngoProfile.ngoName?.trim()) newErrors.ngoName = "NGO Name is required";
    if (!ngoProfile.name?.trim()) newErrors.name = "Name is required";
    if (!ngoProfile.registrationNumber?.trim())
      newErrors.registrationNumber = "Registration number is required";
    if (!ngoProfile.description?.trim())
      newErrors.description = "Description is required";
    if (!ngoProfile.phone?.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!ngoProfile.phone.match(/^\+?\d{10,}$/)) {
      newErrors.phone =
        "Please enter a valid phone number with at least 10 digits";
    }

    if (!ngoProfile.email?.trim()) {
      newErrors.email = "Email is required";
    } else if (!ngoProfile.email.includes("@")) {
      newErrors.email = "Please enter a valid email address";
    }

    if (ngoProfile.pan && !ngoProfile.pan.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) {
      newErrors.pan = "PAN must be in format ABCDE1234F";
    }

    if (!ngoProfile.mission?.trim()) newErrors.mission = "Mission is required";
    if (!ngoProfile.vision?.trim()) newErrors.vision = "Vision is required";
    if (!ngoProfile.state?.trim()) newErrors.state = "State is required";
    if (!ngoProfile.district?.trim())
      newErrors.district = "District is required";
    if (!ngoProfile.type?.trim()) newErrors.type = "NGO Type is required";
    if (!ngoProfile.location) newErrors.location = "Location is required";

    if (ngoProfile.type === "Other") {
      if (!ngoProfile.customType?.trim()) {
        newErrors.customType = "Custom NGO Type is required";
      }
      if (!ngoProfile.customCategory?.trim()) {
        newErrors.customCategory = "Custom NGO Category is required";
      }
      if (!ngoProfile.categories || ngoProfile.categories.length === 0) {
        newErrors.categories = "At least one category is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [ngoProfile]);

  // Optimized save changes function with better error handling
  const handleSaveChanges = useCallback(async () => {
    setIsSubmitting(true);
    setSaveSuccess(false);
    setUploadProgress(0);

    const toasting = toast.loading("Saving profile changes...");

    try {
      if (!validateInputs()) {
        toast.error("Please fill in all required fields", { id: toasting });
        setIsSubmitting(false);
        return;
      }

      let logoFileUrl = ngoProfile.logoUrl;
      const profileToSave = { ...ngoProfile };

      // Set display type based on selection
      if (profileToSave.type === "Other") {
        profileToSave.displayType = profileToSave.customType;
      } else {
        profileToSave.displayType = profileToSave.type;
      }

      // Handle logo upload if there's a new file
      if (ngoProfile.logoFile) {
        const logoRef = ref(storage, `ngo/${userId}/logo`);

        // Delete existing logo if it exists
        if (ngoProfile.logoUrl && ngoProfile.logoUrl.startsWith("https")) {
          try {
            await deleteObject(ref(storage, ngoProfile.logoUrl));
          } catch (error) {
            console.error("Error deleting previous logo:", error);
            // Continue with the upload even if delete fails
          }
        }

        const uploadTask = uploadBytesResumable(logoRef, ngoProfile.logoFile);

        // Monitor upload progress
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
            toast.loading(`Uploading logo: ${Math.round(progress)}%`, {
              id: toasting,
            });
          },
          (error) => {
            console.error("Logo upload error:", error);
            toast.error(`Error uploading logo: ${error.message}`, {
              id: toasting,
            });
            setIsSubmitting(false);
          },
          async () => {
            try {
              logoFileUrl = await getDownloadURL(uploadTask.snapshot.ref);

              // Clean up the profile data before saving
              const filteredProfile = prepareProfileForSave(
                profileToSave,
                logoFileUrl
              );

              await saveProfileToFirestore(filteredProfile, toasting);
            } catch (error) {
              toast.error(`Error finalizing upload: ${error.message}`, {
                id: toasting,
              });
              setIsSubmitting(false);
            }
          }
        );
      } else {
        // No new logo file, just save the profile
        const filteredProfile = prepareProfileForSave(
          profileToSave,
          logoFileUrl
        );
        await saveProfileToFirestore(filteredProfile, toasting);
      }
    } catch (error) {
      console.error("Profile save error:", error);
      toast.error(`An unexpected error occurred: ${error.message}`, {
        id: toasting,
      });
      setIsSubmitting(false);
    }
  }, [ngoProfile, userId, validateInputs]);

  // Helper function to prepare profile data for saving
  const prepareProfileForSave = useCallback((profileData, logoUrl) => {
    // Remove empty values and null values
    const filteredProfile = Object.fromEntries(
      Object.entries(profileData).filter(
        ([key, value]) => value !== null && value !== "" && key !== "logoFile" // Explicitly exclude logoFile
      )
    );

    return {
      ...filteredProfile,
      logoUrl,
      logoFile: null, // Explicitly set logoFile to null
      updatedAt: new Date(), // Add timestamp for when profile was last updated
    };
  }, []);

  // Helper function to save profile to Firestore
  const saveProfileToFirestore = useCallback(
    async (profileData, toastId) => {
      try {
        await setDoc(doc(db, "ngo", userId), profileData, { merge: true });

        // Update local state to reflect saved changes
        setNgoProfile((prev) => ({
          ...prev,
          ...profileData,
          logoFile: null,
        }));

        toast.success("Profile updated successfully", { id: toastId });
        setSaveSuccess(true);

        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        console.error("Firestore update error:", error);
        toast.error(`Error updating profile: ${error.message}`, {
          id: toastId,
        });
      } finally {
        setIsSubmitting(false);
        setUploadProgress(0);
      }
    },
    [userId]
  );

  // Add this RequiredLabel component
  const RequiredLabel = ({ htmlFor, children }) => (
    <Label
      htmlFor={htmlFor}
      className="flex items-center gap-1 text-sm font-medium"
    >
      <span className="text-red-500">*</span>
      {children}
    </Label>
  );

  // Display verification status badge
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
              <Building className="h-6 w-6" />
              <CardTitle className="text-xl">NGO Profile Information</CardTitle>
            </div>
            {getVerificationStatusBadge()}
          </div>
          <p className="mt-2 text-sm">
            Complete your organization profile to improve visibility and
            credibility
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {/* Logo Upload Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-full">
                <Building className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium">Organization Logo</h3>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <Avatar className="w-40 h-40 p-2 border border-gray-200 rounded-xl shadow-sm">
                <AvatarImage
                  src={
                    ngoProfile?.logoUrl || "/placeholder.svg?height=80&width=80"
                  }
                  alt="NGO Logo"
                  className="object-contain"
                />
                <AvatarFallback className="w-full h-full">
                  <Label
                    htmlFor="upload-ngo-logo"
                    className="flex items-center justify-center gap-2 flex-col w-full h-full cursor-pointer"
                  >
                    <Upload className="h-6 w-6 text-gray-500" />
                    <span className="text-xs text-gray-500">Upload Logo</span>
                  </Label>
                  <Input
                    type="file"
                    id="upload-ngo-logo"
                    onChange={handleLogoUpload}
                    accept="image/jpeg,image/png,image/jpg"
                    className="border-gray-300 hidden"
                    disabled={shouldDisableInputs}
                    title={shouldDisableInputs ? pendingTitle : ""}
                  />
                </AvatarFallback>
              </Avatar>

              <div className="space-y-4">
                <div className="text-center md:text-left">
                  <p className="text-sm font-medium mb-1">Organization Logo</p>
                  <p className="text-sm text-gray-500">
                    600 x 600px PNG/JPG (max 2MB)
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <Button
                    variant="outline"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                    onClick={() =>
                      document.getElementById("upload-ngo-logo").click()
                    }
                    disabled={shouldDisableInputs}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() =>
                      setNgoProfile({
                        ...ngoProfile,
                        logoUrl: "",
                        logoFile: null,
                      })
                    }
                    disabled={!ngoProfile?.logoUrl || shouldDisableInputs}
                    title={shouldDisableInputs ? pendingTitle : ""}
                  >
                    <X className="h-4 w-4 mr-2" /> Remove
                  </Button>
                </div>

                {errors.logoFile && (
                  <p className="text-red-500 text-sm">{errors.logoFile}</p>
                )}

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Uploading...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Basic Information Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-violet-50 rounded-full">
                <Info className="h-5 w-5 text-violet-500" />
              </div>
              <h3 className="text-lg font-medium">Basic Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <RequiredLabel htmlFor="ngo-name">NGO Name</RequiredLabel>
                <div className="relative">
                  <Input
                    id="ngo-name"
                    value={ngoProfile?.ngoName || ""}
                    onChange={(e) =>
                      handleInputChange("ngoName", e.target.value)
                    }
                    className="border-gray-300 pl-8"
                    required
                    disabled={shouldDisableInputs}
                    title={shouldDisableInputs ? pendingTitle : ""}
                  />
                  <Building className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {errors.ngoName && (
                  <p className="text-red-500 text-sm">{errors.ngoName}</p>
                )}
              </div>

              <div className="space-y-2">
                <RequiredLabel htmlFor="name">Your Name</RequiredLabel>
                <div className="relative">
                  <Input
                    id="name"
                    value={ngoProfile?.name || ""}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="border-gray-300 pl-8"
                    required
                    disabled={shouldDisableInputs}
                    title={shouldDisableInputs ? pendingTitle : ""}
                  />
                  <Users className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-sm">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <RequiredLabel htmlFor="registration-number">
                  Darpan Registration Number
                </RequiredLabel>
                <div className="relative">
                  <Input
                    id="registration-number"
                    value={ngoProfile?.registrationNumber || ""}
                    onChange={(e) =>
                      handleInputChange("registrationNumber", e.target.value)
                    }
                    className="border-gray-300 pl-8"
                    required
                    disabled={shouldDisableInputs}
                    title={shouldDisableInputs ? pendingTitle : ""}
                  />
                  <Hash className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {errors.registrationNumber && (
                  <p className="text-red-500 text-sm">
                    {errors.registrationNumber}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Type & Category Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-emerald-50 rounded-full">
                <Type className="h-5 w-5 text-emerald-500" />
              </div>
              <h3 className="text-lg font-medium">NGO Type & Category</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <RequiredLabel htmlFor="ngo-type">NGO Type</RequiredLabel>
                <Select
                  id="ngo-type"
                  value={ngoProfile?.type || ""}
                  onValueChange={handleTypeChange}
                  disabled={shouldDisableInputs}
                  title={shouldDisableInputs ? pendingTitle : ""}
                >
                  <SelectTrigger className="w-full border-gray-300">
                    <SelectValue placeholder="Select NGO Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Child Welfare Organizations">
                      Child Welfare Organizations
                    </SelectItem>
                    <SelectItem value="Environmental Conservation Organizations">
                      Environmental Conservation Organizations
                    </SelectItem>
                    <SelectItem value="Public Health & Medical Relief Organizations">
                      Public Health & Medical Relief Organizations
                    </SelectItem>
                    <SelectItem value="Educational Empowerment Organizations">
                      Educational Empowerment Organizations
                    </SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-red-500 text-sm">{errors.type}</p>
                )}
              </div>

              {/* Custom Type Input - only shown when "Other" is selected */}
              {showCustomType && (
                <div className="space-y-2">
                  <RequiredLabel htmlFor="custom-type">
                    Specify NGO Type
                  </RequiredLabel>
                  <Input
                    id="custom-type"
                    value={ngoProfile?.customType || ""}
                    onChange={(e) =>
                      handleInputChange("customType", e.target.value)
                    }
                    className="border-gray-300"
                    required
                    disabled={shouldDisableInputs}
                    title={shouldDisableInputs ? pendingTitle : ""}
                    placeholder="Enter your NGO type"
                  />
                  {errors.customType && (
                    <p className="text-red-500 text-sm">{errors.customType}</p>
                  )}
                </div>
              )}

              {/* Custom Category Input - only shown when "Other" is selected for type */}
              {showCustomType && (
                <div className="space-y-2">
                  <RequiredLabel htmlFor="custom-category">
                    Specify NGO Category
                  </RequiredLabel>
                  <Input
                    id="custom-category"
                    value={ngoProfile?.customCategory || ""}
                    onChange={(e) => handleCustomCategoryChange(e.target.value)}
                    className="border-gray-300"
                    required
                    disabled={shouldDisableInputs}
                    title={shouldDisableInputs ? pendingTitle : ""}
                    placeholder="Enter your NGO category for activities"
                  />
                  {errors.customCategory && (
                    <p className="text-red-500 text-sm">
                      {errors.customCategory}
                    </p>
                  )}
                </div>
              )}

              {/* Display the categories that will be stored (for user information) */}
              {ngoProfile.type &&
                ngoProfile.categories &&
                ngoProfile.categories.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Categories</Label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      {ngoProfile.categories.map((category, index) => (
                        <span
                          key={index}
                          className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2 mb-2"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </section>

          {/* Mission & Vision Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-amber-50 rounded-full">
                <Target className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="text-lg font-medium">Mission & Vision</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <RequiredLabel htmlFor="mission">Mission</RequiredLabel>
                <Textarea
                  id="mission"
                  value={ngoProfile?.mission || ""}
                  onChange={(e) => handleInputChange("mission", e.target.value)}
                  className="border-gray-300 resize-none min-h-[120px]"
                  required
                  disabled={shouldDisableInputs}
                  title={shouldDisableInputs ? pendingTitle : ""}
                  placeholder="Our mission is to..."
                />
                {errors.mission && (
                  <p className="text-red-500 text-sm">{errors.mission}</p>
                )}
              </div>

              <div className="space-y-2">
                <RequiredLabel htmlFor="vision">Vision</RequiredLabel>
                <Textarea
                  id="vision"
                  value={ngoProfile?.vision || ""}
                  onChange={(e) => handleInputChange("vision", e.target.value)}
                  className="border-gray-300 resize-none min-h-[120px]"
                  required
                  disabled={shouldDisableInputs}
                  title={shouldDisableInputs ? pendingTitle : ""}
                  placeholder="Our vision is a world where..."
                />
                {errors.vision && (
                  <p className="text-red-500 text-sm">{errors.vision}</p>
                )}
              </div>
            </div>
          </section>

          {/* Description Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-cyan-50 rounded-full">
                <FileText className="h-5 w-5 text-cyan-500" />
              </div>
              <h3 className="text-lg font-medium">About Organization</h3>
            </div>

            <div className="space-y-2">
              <RequiredLabel htmlFor="description">Description</RequiredLabel>
              <Textarea
                id="description"
                value={ngoProfile?.description || ""}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className="border-gray-300 resize-none min-h-[150px]"
                rows={4}
                required
                disabled={shouldDisableInputs}
                title={shouldDisableInputs ? pendingTitle : ""}
                placeholder="Provide a detailed description of your organization, its history, and impact..."
              />
              {errors.description && (
                <p className="text-red-500 text-sm">{errors.description}</p>
              )}
            </div>
          </section>

          {/* Contact Information Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-indigo-50 rounded-full">
                <Phone className="h-5 w-5 text-indigo-500" />
              </div>
              <h3 className="text-lg font-medium">Contact Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <RequiredLabel htmlFor="phone">Phone</RequiredLabel>
                <div className="relative">
                  <Input
                    id="phone"
                    value={ngoProfile?.phone || ""}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="border-gray-300 pl-8"
                    required
                    disabled={shouldDisableInputs}
                    title={shouldDisableInputs ? pendingTitle : ""}
                    placeholder="+91 1234567890"
                  />
                  <Phone className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-sm">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <RequiredLabel htmlFor="email">Email</RequiredLabel>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={ngoProfile?.email || ""}
                    readOnly
                    className="border-gray-300 pl-8 bg-gray-50"
                    required
                    disabled={true}
                    title="Email cannot be changed"
                  />
                  <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Input
                    id="website"
                    value={ngoProfile?.website || ""}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                    className="border-gray-300 pl-8"
                    disabled={shouldDisableInputs}
                    title={shouldDisableInputs ? pendingTitle : ""}
                    placeholder="https://www.example.org"
                  />
                  <Globe className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pan">PAN Number</Label>
                <div className="relative">
                  <Input
                    id="pan"
                    value={ngoProfile?.pan || ""}
                    onChange={(e) => handleInputChange("pan", e.target.value)}
                    className="border-gray-300 pl-8"
                    disabled={shouldDisableInputs}
                    title={shouldDisableInputs ? pendingTitle : ""}
                    placeholder="ABCDE1234F"
                  />
                  <FileText className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {errors.pan && (
                  <p className="text-red-500 text-sm">{errors.pan}</p>
                )}
              </div>
            </div>
          </section>

          {/* Location Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-rose-50 rounded-full">
                <MapPin className="h-5 w-5 text-rose-500" />
              </div>
              <h3 className="text-lg font-medium">Location</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <RequiredLabel htmlFor="location">Location</RequiredLabel>
                <div className="flex items-center gap-2">
                  <Input
                    id="location"
                    value={ngoProfile?.location?.address || ""}
                    className="border-gray-300 flex-grow"
                    placeholder="Select location on map"
                    disabled
                  />
                  <LocationDialog
                    onLocationSelect={(location) => {
                      handleInputChange("location", location);
                      setErrors((prev) => ({ ...prev, location: undefined }));
                    }}
                    defaultLocation={ngoProfile?.location}
                  />
                </div>
                {errors.location && (
                  <p className="text-red-500 text-sm">{errors.location}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address">Full Address</Label>
                <div className="relative">
                  <Input
                    id="address"
                    value={ngoProfile?.address || ""}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    className="border-gray-300 pl-8"
                    disabled={shouldDisableInputs}
                    title={shouldDisableInputs ? pendingTitle : ""}
                    placeholder="Street address, building, etc."
                  />
                  <MapPin className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <RequiredLabel htmlFor="state">State</RequiredLabel>
                <Input
                  id="state"
                  value={ngoProfile?.state || ""}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  className="border-gray-300"
                  required
                  disabled={shouldDisableInputs}
                  title={shouldDisableInputs ? pendingTitle : ""}
                />
                {errors.state && (
                  <p className="text-red-500 text-sm">{errors.state}</p>
                )}
              </div>

              <div className="space-y-2">
                <RequiredLabel htmlFor="district">District</RequiredLabel>
                <Input
                  id="district"
                  value={ngoProfile?.district || ""}
                  onChange={(e) =>
                    handleInputChange("district", e.target.value)
                  }
                  className="border-gray-300"
                  required
                  disabled={shouldDisableInputs}
                  title={shouldDisableInputs ? pendingTitle : ""}
                />
                {errors.district && (
                  <p className="text-red-500 text-sm">{errors.district}</p>
                )}
              </div>
            </div>
          </section>

          {/* Social Media Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-full">
                <Globe className="h-5 w-5 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium">Social Media</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-2">
                <Facebook className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <Input
                  value={ngoProfile?.facebook || ""}
                  onChange={(e) =>
                    handleInputChange("facebook", e.target.value)
                  }
                  className="border-gray-300"
                  disabled={shouldDisableInputs}
                  title={shouldDisableInputs ? pendingTitle : ""}
                  placeholder="https://facebook.com/yourpage"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Twitter className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <Input
                  value={ngoProfile?.twitter || ""}
                  onChange={(e) => handleInputChange("twitter", e.target.value)}
                  className="border-gray-300"
                  disabled={shouldDisableInputs}
                  title={shouldDisableInputs ? pendingTitle : ""}
                  placeholder="https://twitter.com/yourhandle"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Instagram className="h-5 w-5 text-pink-600 flex-shrink-0" />
                <Input
                  value={ngoProfile?.instagram || ""}
                  onChange={(e) =>
                    handleInputChange("instagram", e.target.value)
                  }
                  className="border-gray-300"
                  disabled={shouldDisableInputs}
                  title={shouldDisableInputs ? pendingTitle : ""}
                  placeholder="https://instagram.com/youraccount"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Linkedin className="h-5 w-5 text-blue-700 flex-shrink-0" />
                <Input
                  value={ngoProfile?.linkedin || ""}
                  onChange={(e) =>
                    handleInputChange("linkedin", e.target.value)
                  }
                  className="border-gray-300"
                  disabled={shouldDisableInputs}
                  title={shouldDisableInputs ? pendingTitle : ""}
                  placeholder="https://linkedin.com/company/yourorg"
                />
              </div>
            </div>
          </section>

          {/* Success message */}
          {saveSuccess && (
            <Alert className="bg-green-50 border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="ml-2 text-green-700">
                Profile updated successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              className="bg-[#1CAC78] hover:bg-[#158f63] flex items-center gap-2 px-6"
              onClick={handleSaveChanges}
              disabled={shouldDisableInputs}
              title={shouldDisableInputs ? pendingTitle : ""}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <SaveIcon className="h-4 w-4" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(ProfileInformation);
