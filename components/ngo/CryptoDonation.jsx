"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/context/AuthContext";

const CryptoDonation = () => {
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [donationImage, setDonationImage] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { profile } = useAuth();

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setDonationImage(e.target.files[0]);
    }
  };

  const uploadImageToFirebase = async () => {
    if (!donationImage) {
      toast.error("Please select an image to upload");
      return;
    }

    setIsUploading(true);
    const toasting = toast.loading("Uploading image...");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");

      // Create a reference to the users/{userId} folder
      const timestamp = Date.now().toString();
      const fileName = `crypto_donation_${timestamp}_${donationImage.name}`;
      const storageRef = ref(storage, `users/${currentUser.uid}/${fileName}`);

      // Upload the file
      await uploadBytes(storageRef, donationImage);

      // Get download URL
      const url = await getDownloadURL(storageRef);
      setImageUrl(url);

      // Reset form
      setDonationImage(null);
      setAlertDialogOpen(false);

      toast.success("Image uploaded successfully", { id: toasting });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image", { id: toasting });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogTrigger asChild>
          <div className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer">
            Request payout
          </div>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request payout</AlertDialogTitle>
            <AlertDialogDescription>
              Choose an image to upload to your user storage.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-3 mt-2">
            <Label>Select Image</Label>
            <Input type="file" accept="image/*" onChange={handleImageChange} />
            {donationImage && (
              <p className="text-xs text-green-600">
                Image selected: {donationImage.name}
              </p>
            )}
          </div>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={uploadImageToFirebase}
              disabled={isUploading || !donationImage}
            >
              {isUploading ? "Uploading..." : "Upload Image"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CryptoDonation;
