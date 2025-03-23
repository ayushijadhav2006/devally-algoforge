"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { toast } from "react-hot-toast";
import { useGamification } from "@/context/GamificationContext";
import { updateCampaignRaisedAmount } from "@/lib/campaign";

const CampaignDonate = ({ campaign }) => {
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState("");
  const [wantsCertificate, setWantsCertificate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { recordDonation } = useGamification();

  const openDonateModal = () => {
    if (!auth.currentUser) {
      toast.error("Please login to donate");
      return;
    }
    setIsDonateModalOpen(true);
  };

  const closeDonateModal = () => {
    setIsDonateModalOpen(false);
    setDonationAmount("");
    setWantsCertificate(false);
  };

  const handleDonationSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error("Please login to donate");
      return;
    }

    // Validate amount
    const amount = parseFloat(donationAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Check if campaign is still active
    const campaignDate = new Date(campaign.date);
    const isExpired = campaignDate < new Date();
    
    if (isExpired) {
      toast.error("This campaign has expired");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Get NGO's Razorpay keys
      const ngoRef = doc(db, 'ngo', campaign.ngoId);
      const ngoDoc = await getDoc(ngoRef);
      
      if (!ngoDoc.exists()) {
        toast.error("NGO not found");
        return;
      }

      const ngoData = ngoDoc.data();
      if (!ngoData.donationsData?.razorpayKeyId || !ngoData.donationsData?.razorpayKeySecret) {
        toast.error("Payment not configured for this NGO");
        return;
      }

      // Create order
      const response = await fetch("/api/create-donation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: donationAmount,
          userId: auth.currentUser.uid,
          ngoId: campaign.ngoId,
          campaignId: campaign.id,
          rzpKeyId: ngoData.donationsData.razorpayKeyId,
          rzpKeySecret: ngoData.donationsData.razorpayKeySecret,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create donation order');
      }

      const { orderId, amount: orderAmount } = await response.json();

      // Initialize Razorpay
      const options = {
        key: ngoData.donationsData.razorpayKeyId,
        amount: orderAmount,
        currency: "INR",
        name: campaign.name,
        description: "Campaign Donation",
        order_id: orderId,
        handler: async (response) => {
          await saveDonationData(response);
        },
        prefill: {
          name: auth.currentUser.displayName || '',
          email: auth.currentUser.email || '',
        },
        theme: {
          color: "#1CAC78",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error(error.message || "Failed to process payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDonationData = async (paymentResponse) => {
    try {
      const amount = parseFloat(donationAmount);
      const currentDate = new Date().toISOString();
      
      // Create donation record
      const donationData = {
        amount: amount,
        campaignId: campaign.id,
        campaignName: campaign.name,
        ngoId: campaign.ngoId,
        ngoName: campaign.ngoName,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || '',
        userEmail: auth.currentUser.email || '',
        paymentId: paymentResponse.razorpay_payment_id,
        orderId: paymentResponse.razorpay_order_id,
        signature: paymentResponse.razorpay_signature,
        status: 'completed',
        date: currentDate,
        wantsCertificate: wantsCertificate,
        donationType: 'campaign'
      };
      
      // Save to campaign donations
      const docRef = doc(
        db,
        "campaigns",
        campaign.id,
        "donations",
        auth.currentUser.uid
      );
      await setDoc(docRef, donationData, { merge: true });
      
      // Update campaign raised amount
      await updateCampaignRaisedAmount(campaign.id, amount);
      
      // Update user's donation record
      const userDonationRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "donatedTo",
        campaign.ngoId
      );
      await setDoc(
        userDonationRef,
        {
          amount: increment(amount),
          timestamp: currentDate,
          lastCampaignDonation: {
            campaignId: campaign.id,
            campaignName: campaign.name,
            amount: amount,
            date: currentDate
          }
        },
        { merge: true }
      );
      
      // Update NGO's total donations
      const ngoRef = doc(db, "ngo", campaign.ngoId);
      await updateDoc(ngoRef, {
        totalDonations: increment(amount)
      });
      
      // Add to user's total donated
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        totalDonated: increment(amount)
      });
      
      // Record donation for gamification
      if (recordDonation) {
        try {
          const gamificationData = {
            amount: amount,
            campaignId: campaign.id,
            ngoId: campaign.ngoId,
            timestamp: currentDate
          };
          
          const gamificationResult = await recordDonation(gamificationData);
          
          if (gamificationResult?.pointsAwarded) {
            toast.success(`Thank you for your donation of ₹${amount}! You earned ${gamificationResult.pointsAwarded} points!`);
            
            // Check if any new badges were earned
            if (gamificationResult.newBadges && gamificationResult.newBadges.length > 0) {
              // Display toast for each new badge
              gamificationResult.newBadges.forEach(badge => {
                setTimeout(() => {
                  toast.success(`🏆 New badge earned: ${badge.name}!`, {
                    duration: 5000,
                    style: {
                      border: '1px solid #10B981',
                      padding: '16px',
                      color: '#064E3B',
                    },
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#FFFFFF',
                    },
                  });
                }, 1000); // Show badge notifications with a slight delay
              });
            }
          } else {
            toast.success(`Thank you for your donation of ₹${amount} to ${campaign.name}!`);
          }
        } catch (gamificationError) {
          console.error("Error recording gamification:", gamificationError);
          // Still show success even if gamification fails
          toast.success(`Thank you for your donation of ₹${amount} to ${campaign.name}!`);
        }
      } else {
        toast.success(`Thank you for your donation of ₹${amount} to ${campaign.name}!`);
      }
      
      // Close modal
      closeDonateModal();
      
    } catch (error) {
      console.error("Error saving donation data:", error);
      toast.error("Donation completed, but there was an error saving your donation data.");
    }
  };

  return (
    <>
      <Button 
        onClick={openDonateModal} 
        className="w-full lg:w-auto bg-[#1CAC78] hover:bg-[#18956A] text-white"
      >
        Donate Now
      </Button>

      <Dialog open={isDonateModalOpen} onOpenChange={closeDonateModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Donate to {campaign.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDonationSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount (₹)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="col-span-3"
                  min="1"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wantsCertificate"
                  checked={wantsCertificate}
                  onCheckedChange={setWantsCertificate}
                />
                <Label htmlFor="wantsCertificate">
                  I want a tax redemption certificate
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDonateModal} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !donationAmount}>
                {isSubmitting ? "Processing..." : "Proceed to Pay"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CampaignDonate; 