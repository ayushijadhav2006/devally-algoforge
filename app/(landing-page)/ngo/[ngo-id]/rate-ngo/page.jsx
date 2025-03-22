"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";

const RateNGOPage = () => {
  const { "ngo-id": ngoId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [formData, setFormData] = useState({
    rating: "",
    message: "",
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, [ngoId]);

  const checkAuthAndLoadData = async () => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setError("Please login to submit rating");
        setLoading(false);
        return;
      }

      try {
        // Fetch user data
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserEmail(userData.email || "");
          setUserName(userData.name || "");

          // Check if user has already rated
          const ratingsSnapshot = await getDocs(
            query(
              collection(db, "ngo", ngoId, "ratings"),
              where("userEmail", "==", userData.email)
            )
          );

          if (!ratingsSnapshot.empty) {
            setError("You have already rated this NGO");
            setLoading(false);
            return;
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setError("Failed to load user data");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  };

  const calculateOverallRating = async () => {
    try {
      // Get all direct NGO ratings
      const ratingsSnapshot = await getDocs(
        collection(db, "ngo", ngoId, "ratings")
      );
      let totalDirectRating = 0;
      let directRatingCount = 0;

      ratingsSnapshot.forEach((doc) => {
        totalDirectRating += doc.data().rating;
        directRatingCount++;
      });

      // Get all activities and their average ratings
      const activitiesSnapshot = await getDocs(collection(db, "activities"));
      let totalActivityRating = 0;
      let activityRatingCount = 0;

      for (const activityDoc of activitiesSnapshot.docs) {
        const activityData = activityDoc.data();
        if (activityData.ngoId === ngoId && activityData.avgRating) {
          totalActivityRating += activityData.avgRating;
          activityRatingCount++;
        }
      }

      // Calculate weighted average (60% direct ratings, 40% activity ratings)
      let overallRating = 0;
      if (directRatingCount > 0 && activityRatingCount > 0) {
        overallRating =
          (totalDirectRating / directRatingCount) * 0.6 +
          (totalActivityRating / activityRatingCount) * 0.4;
      } else if (directRatingCount > 0) {
        overallRating = totalDirectRating / directRatingCount;
      } else if (activityRatingCount > 0) {
        overallRating = totalActivityRating / activityRatingCount;
      }

      return Number(overallRating.toFixed(2));
    } catch (error) {
      console.error("Error calculating overall rating:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.rating) {
      setError("Please select a rating");
      return;
    }

    try {
      const ratingId = Math.random().toString(36).substr(2, 9);

      await setDoc(doc(db, "ngo", ngoId, "ratings", ratingId), {
        userEmail,
        userName,
        rating: parseInt(formData.rating),
        message: formData.message,
        submittedAt: new Date(),
      });

      // Calculate and update overall NGO rating
      const overallRating = await calculateOverallRating();
      await updateDoc(doc(db, "ngo", ngoId), {
        ngoRating: overallRating,
      });

      setSuccess(true);
    } catch (error) {
      console.error("Error submitting rating:", error);
      setError("Failed to submit rating");
    }
  };

  if (loading) {
    return <div className="container mx-auto p-8 mt-16">Loading...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 mt-16">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">{error}</div>
            <div className="mt-4 text-center">
              <Button
                onClick={() => router.push(`/ngo/${ngoId}`)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Back to NGO Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto p-8 mt-16">
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-green-600">Thank You!</h2>
              <p className="text-gray-600">
                Your rating has been submitted successfully.
              </p>
              <p className="text-gray-600">We appreciate your feedback!</p>
              <Button
                onClick={() => router.push(`/ngo/${ngoId}`)}
                className="bg-green-600 hover:bg-green-700"
              >
                Back to NGO Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 mt-16">
      <Card>
        <CardHeader>
          <CardTitle>Rate this NGO</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={userName} readOnly className="bg-gray-100" />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={userEmail} readOnly className="bg-gray-100" />
            </div>

            <div className="space-y-2">
              <Label>Rating</Label>
              <RadioGroup
                value={formData.rating}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, rating: value }))
                }
                className="flex space-x-4"
              >
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div key={rating} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={rating.toString()}
                      id={`rating-${rating}`}
                    />
                    <Label htmlFor={`rating-${rating}`}>{rating}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Message (Optional)</Label>
              <Textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, message: e.target.value }))
                }
                placeholder="Share your experience with this NGO..."
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Submit Rating
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RateNGOPage;
