"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  updateDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import { auth } from "@/lib/firebase";

const FeedbackForm = () => {
  const { "activity-id": activityId } = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fields: [],
  });
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [activityName, setActivityName] = useState("");
  const [formStatus, setFormStatus] = useState("not-accepting");

  useEffect(() => {
    let unsubscribeActivity;
    let unsubscribeAuth;

    const setupActivityListener = (user) => {
      if (!user) {
        setError("Please login to submit feedback");
        setLoading(false);
        return () => {};
      }

      // Set up real-time listener for activity document
      const activityRef = doc(db, "activities", activityId);
      return onSnapshot(
        activityRef,
        async (activityDoc) => {
          if (!activityDoc.exists()) {
            setError("Activity not found");
            setLoading(false);
            return;
          }

          const activityData = activityDoc.data();
          setActivityName(activityData.activityName || "");
          setFormStatus(activityData.feedbackFormStatus || "not-accepting");

          // Reset error state when form becomes active
          if (activityData.feedbackFormStatus === "accepting") {
            setError("");
            try {
              // Fetch user data
              const userDoc = await getDoc(doc(db, "users", user.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                setUserEmail(userData.email || "");
                setUserName(userData.name || "");

                // Check if user has already submitted feedback
                const responsesSnapshot = await getDocs(
                  query(
                    collection(db, "activities", activityId, "responses"),
                    where("userEmail", "==", userData.email)
                  )
                );

                if (!responsesSnapshot.empty) {
                  setHasSubmitted(true);
                  setError(
                    `${userData.email} You have already filled the form`
                  );
                  setLoading(false);
                  return;
                }
              }

              // Load form data
              await loadForm();
            } catch (error) {
              console.error("Error:", error);
              setError("Failed to load data");
            }
          } else {
            setError("Feedback form is currently closed");
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error setting up activity listener:", error);
          setError("Failed to load activity data");
          setLoading(false);
        }
      );
    };

    // Set up auth state listener
    unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubscribeActivity) {
        unsubscribeActivity();
      }
      unsubscribeActivity = setupActivityListener(user);
    });

    return () => {
      if (unsubscribeActivity) {
        unsubscribeActivity();
      }
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [activityId]);

  const loadForm = async () => {
    try {
      const formDoc = await getDoc(
        doc(db, "activities", activityId, "forms", "feedback")
      );
      if (formDoc.exists()) {
        const data = formDoc.data();
        setFormData({
          title: data.title || "",
          description: data.description || "",
          fields: data.fields || [],
        });

        // Initialize responses with user email and name pre-filled
        const initialResponses = {};
        data.fields.forEach((field) => {
          if (field.type === "email") {
            initialResponses[field.id] = userEmail;
          } else if (field.type === "short_text" && field.label === "Name") {
            initialResponses[field.id] = userName;
          } else if (field.type === "multiple_choice") {
            initialResponses[field.id] = [];
          } else {
            initialResponses[field.id] = "";
          }
        });
        setResponses(initialResponses);
      } else {
        setError("Form not found");
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading form:", error);
      setError("Failed to load form");
      setLoading(false);
    }
  };

  const handleInputChange = (fieldId, value) => {
    setResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleCheckboxChange = (fieldId, option, checked) => {
    setResponses((prev) => ({
      ...prev,
      [fieldId]: checked
        ? [...(prev[fieldId] || []), option]
        : (prev[fieldId] || []).filter((item) => item !== option),
    }));
  };

  const validateResponses = () => {
    const errors = [];
    formData.fields.forEach((field) => {
      if (field.required) {
        const response = responses[field.id];
        // Skip validation for pre-filled name and email fields
        if (
          field.type === "email" ||
          (field.type === "short_text" && field.label === "Name")
        ) {
          return;
        }
        if (!response || (Array.isArray(response) && response.length === 0)) {
          errors.push(`${field.label} is required`);
        }
      }
    });
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasSubmitted) {
      setError(`${userEmail} You have already filled the form`);
      return;
    }

    // Check if feedback form is still accepting responses
    const activityDoc = await getDoc(doc(db, "activities", activityId));
    if (
      !activityDoc.exists() ||
      activityDoc.data().feedbackFormStatus !== "accepting"
    ) {
      setError("Feedback form is currently closed");
      return;
    }

    // Add validation for name and email specifically
    if (!userName || !userEmail) {
      setError("User information is missing. Please try logging in again.");
      return;
    }

    const validationErrors = validateResponses();
    if (validationErrors.length > 0) {
      setError(validationErrors.join("\n"));
      return;
    }

    try {
      const responseId = uuidv4();

      // Get the rating value from responses
      const ratingField = formData.fields.find(
        (field) => field.type === "rating"
      );
      const newRating = ratingField ? parseInt(responses[ratingField.id]) : 0;

      // Get the activity document to update average rating
      const activityRef = doc(db, "activities", activityId);
      const activityDoc = await getDoc(activityRef);

      if (activityDoc.exists()) {
        const activityData = activityDoc.data();
        const currentTotalRatings = activityData.totalRatings || 0;
        const currentAvgRating = activityData.avgRating || 0;

        // Calculate new average rating
        const newTotalRatings = currentTotalRatings + 1;
        const newAvgRating =
          (currentAvgRating * currentTotalRatings + newRating) /
          newTotalRatings;

        // Update activity document with new average rating
        await updateDoc(activityRef, {
          avgRating: newAvgRating,
          totalRatings: newTotalRatings,
        });
      } else {
        // If it's the first rating
        await updateDoc(activityRef, {
          avgRating: newRating,
          totalRatings: 1,
        });
      }

      // Save the feedback response with user email
      await setDoc(
        doc(
          db,
          "activities",
          activityId,
          "forms",
          "feedback",
          "responses",
          responseId
        ),
        {
          id: responseId,
          responses,
          userEmail: userEmail,
          userName: userName,
          submittedAt: new Date(),
        }
      );

      setSuccess(true);
      setHasSubmitted(true);
      // Reset form
      const initialResponses = {};
      formData.fields.forEach((field) => {
        if (field.type === "multiple_choice") {
          initialResponses[field.id] = [];
        } else {
          initialResponses[field.id] = "";
        }
      });
      setResponses(initialResponses);
    } catch (error) {
      console.error("Error submitting form:", error);
      setError("Failed to submit form");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">{activityName}</h2>
              <div className="text-red-500 mb-4">{error}</div>
              <Button
                onClick={() => router.push("/")}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (formStatus !== "accepting") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">{activityName}</h2>
              <div className="text-amber-600 mb-4">
                This feedback form is currently closed
              </div>
              <Button
                onClick={() => router.push("/")}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-green-600">Thank You!</h2>
              <p className="text-gray-600">
                Your feedback has been submitted successfully.
              </p>
              <p className="text-gray-600">
                We appreciate your time and valuable feedback!
              </p>
              <Button
                onClick={() => router.push("/")}
                className="bg-green-600 hover:bg-green-700"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderField = (field) => {
    switch (field.type) {
      case "short_text":
        if (field.label === "Name") {
          return <Input value={userName} readOnly className="bg-gray-100" />;
        }
        return (
          <Input
            value={responses[field.id] || ""}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );
      case "long_text":
        return (
          <Textarea
            value={responses[field.id] || ""}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={responses[field.id] || ""}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );
      case "email":
        return (
          <Input
            type="email"
            value={userEmail}
            readOnly
            className="bg-gray-100"
          />
        );
      case "phone":
        return (
          <Input
            type="tel"
            value={responses[field.id] || ""}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );
      case "single_choice":
        return (
          <RadioGroup
            value={responses[field.id] || ""}
            onValueChange={(value) => handleInputChange(field.id, value)}
          >
            {field.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${index}`} />
                <Label htmlFor={`${field.id}-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "multiple_choice":
        return (
          <div className="space-y-2">
            {field.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${index}`}
                  checked={(responses[field.id] || []).includes(option)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(field.id, option, checked)
                  }
                />
                <Label htmlFor={`${field.id}-${index}`}>{option}</Label>
              </div>
            ))}
          </div>
        );
      case "rating":
        return (
          <RadioGroup
            value={responses[field.id] || ""}
            onValueChange={(value) => handleInputChange(field.id, value)}
            className="flex space-x-4"
          >
            {[1, 2, 3, 4, 5].map((rating) => (
              <div key={rating} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={rating.toString()}
                  id={`${field.id}-${rating}`}
                />
                <Label htmlFor={`${field.id}-${rating}`}>{rating}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>{formData.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{formData.description}</p>
          <form onSubmit={handleSubmit}>
            {formData.fields.map((field) => (
              <div key={field.id} className="mb-4">
                <Label htmlFor={field.id}>{field.label}</Label>
                {renderField(field)}
              </div>
            ))}
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackForm;
