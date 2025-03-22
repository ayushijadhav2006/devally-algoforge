"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Upload,
  Check,
  FileText,
  Award,
  Clock,
  AlertCircle,
  ShieldCheck,
  File,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const VerificationInformation = ({
  ngoId,
  approvalStatus,
  verificationStatus,
}) => {
  const [documents, setDocuments] = useState({});
  const [files, setFiles] = useState({});
  const [status, setStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const RequiredLabel = ({ children }) => (
    <Label className="flex items-center gap-1 text-sm font-medium">
      <span className="text-red-500">*</span>
      {children}
    </Label>
  );

  const documentTypes = [
    {
      name: "Registration Certificate",
      required: true,
      description: "Official certificate of registration for your NGO",
      group: "essential",
    },
    {
      name: "PAN Card of NGO",
      required: true,
      description: "Permanent Account Number card issued to your organization",
      group: "essential",
    },
    {
      name: "Trust Deed or MOA",
      required: true,
      description: "Memorandum of Association or Trust Deed document",
      group: "essential",
    },
    {
      name: "Director or Trustee Aadhaar & PAN",
      required: true,
      description: "Identity and tax documents of directors or trustees",
      group: "essential",
    },
    {
      name: "12A Certificate",
      required: false,
      description: "Income tax exemption certificate under section 12A",
      group: "tax",
    },
    {
      name: "80G Certificate",
      required: false,
      description: "Tax deduction certificate under section 80G",
      group: "tax",
    },
    {
      name: "FCRA Certificate",
      required: false,
      description: "Foreign Contribution Regulation Act certificate",
      group: "compliance",
    },
    {
      name: "GST Certificate",
      required: false,
      description: "Goods and Services Tax registration certificate",
      group: "tax",
    },
    {
      name: "Annual Reports & Financials",
      required: false,
      description: "Latest annual reports and financial statements",
      group: "compliance",
    },
  ];

  // Group documents by their categories
  const documentGroups = {
    essential: {
      title: "Essential Documents",
      icon: <FileText className="h-5 w-5 text-blue-500" />,
      description: "Required documentation for basic verification",
    },
    tax: {
      title: "Tax Documents",
      icon: <Award className="h-5 w-5 text-violet-500" />,
      description: "Tax-related certificates and registrations",
    },
    compliance: {
      title: "Compliance Documents",
      icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
      description: "Additional compliance and reporting documents",
    },
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      const docRef = doc(db, "ngo", ngoId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setDocuments(docSnap.data().verificationDocuments || {});
        setStatus(docSnap.data().governmentRecognitionStatus || "");
      }
    };

    fetchDocuments();
  }, [ngoId]);

  const handleFileChange = (type, file) => {
    setFiles((prev) => ({ ...prev, [type]: file }));
    setUploadSuccess(false);
  };

  const handleUpload = async () => {
    setIsUploading(true);
    setUploadSuccess(false);

    try {
      const docRef = doc(db, "ngo", ngoId);
      const newDocuments = { ...documents };

      for (const [type, file] of Object.entries(files)) {
        const storageRef = ref(storage, `ngo/${ngoId}/documents/${type}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        newDocuments[type] = downloadURL;
      }

      await updateDoc(docRef, {
        verificationDocuments: newDocuments,
        governmentRecognitionStatus: status,
      });

      setDocuments(newDocuments);
      setFiles({});
      setUploadSuccess(true);
    } catch (error) {
      console.error("Error uploading documents:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const isAllRequiredDocumentsUploaded = () => {
    return (
      documentTypes.every(
        (type) => !type.required || files[type.name] || documents[type.name]
      ) && status !== ""
    );
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
          <Check className="w-4 h-4 mr-1" /> Verified
        </div>
      );
    } else if (
      verificationStatus === "pending" ||
      approvalStatus === "pending"
    ) {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-4 h-4 mr-1" /> Pending Verification
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

  const renderDocumentInput = (doc) => {
    return (
      <div
        key={doc.name}
        className="space-y-2 bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
      >
        <div className="flex items-start justify-between">
          <div>
            {doc.required ? (
              <RequiredLabel>{doc.name}</RequiredLabel>
            ) : (
              <Label className="text-sm font-medium">{doc.name}</Label>
            )}
            <p className="text-xs text-gray-500 mt-1">{doc.description}</p>
          </div>
          {documents[doc.name] && (
            <Badge className="text-green-800 border-0">
              <Check className="h-3 w-3 mr-1" /> Uploaded
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          {documents[doc.name] && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => window.open(documents[doc.name], "_blank")}
                  >
                    <File className="h-4 w-4 mr-1" /> View
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View uploaded document</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <div
            className={`relative flex-1 ${files[doc.name] ? "bg-blue-50 rounded border border-blue-200" : ""}`}
          >
            <Input
              type="file"
              className={`border-gray-300 w-full ${files[doc.name] ? "text-blue-600 opacity-100" : "file:bg-gray-100 file:hover:bg-gray-200"} file:border-0 file:text-gray-600 file:rounded file:px-3 file:py-1 file:mr-2`}
              accept=".pdf"
              onChange={(e) => handleFileChange(doc.name, e.target.files[0])}
              disabled={shouldDisableInputs}
              title={shouldDisableInputs ? pendingTitle : ""}
            />
            {files[doc.name] && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">
                  Selected
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto">
      <Card className="shadow-md border-0 overflow-hidden">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="h-6 w-6 " />
              <CardTitle className=" text-xl">
                Verification & Compliance
              </CardTitle>
            </div>
            {getVerificationStatusBadge()}
          </div>
          <p className="mt-2 text-sm">
            Upload required documentation to verify your NGO status and
            compliance
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {/* Government Recognition Status Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-full">
                <Award className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium">
                Government Recognition Status
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                <AlertCircle className="h-5 w-5 text-gray-500 mt-0.5" />
                <p className="text-sm text-gray-600">
                  Please select your organization's current recognition status
                  with the government. This information is required for
                  verification.
                </p>
              </div>

              <div className="max-w-md">
                <RequiredLabel>Current Status</RequiredLabel>
                <Select
                  value={status}
                  onValueChange={setStatus}
                  required
                  disabled={shouldDisableInputs}
                >
                  <SelectTrigger className="mt-2 border-gray-300 bg-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recognized">Recognized</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="not-applied">Not Applied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Document Upload Sections - Grouped by category */}
          {Object.entries(documentGroups).map(([groupKey, group]) => (
            <section
              key={groupKey}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gray-50 rounded-full">{group.icon}</div>
                <div>
                  <h3 className="text-lg font-medium">{group.title}</h3>
                  <p className="text-sm text-gray-500">{group.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {documentTypes
                  .filter((doc) => doc.group === groupKey)
                  .map((doc) => renderDocumentInput(doc))}
              </div>
            </section>
          ))}

          {/* Success message */}
          {uploadSuccess && (
            <Alert className="bg-green-50 border-green-200 rounded-lg">
              <Check className="h-4 w-4 text-green-500" />
              <AlertDescription className="ml-2 text-green-700">
                Documents successfully uploaded and information updated!
              </AlertDescription>
            </Alert>
          )}

          {/* Submit button */}
          <div className="flex justify-end">
            <Button
              className="bg-[#1CAC78] hover:bg-[#158f63] flex items-center gap-2"
              onClick={handleUpload}
              disabled={
                !isAllRequiredDocumentsUploaded() ||
                shouldDisableInputs ||
                isUploading
              }
              title={shouldDisableInputs ? pendingTitle : ""}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Update Verification Documents</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationInformation;
