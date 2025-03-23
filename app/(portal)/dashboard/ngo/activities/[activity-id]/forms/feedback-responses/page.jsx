"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import toast from "react-hot-toast";

const FeedbackResponsesPage = () => {
  const { "activity-id": activityId } = useParams();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityName, setActivityName] = useState("");
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    const fetchActivityName = async () => {
      const activityDoc = await getDoc(doc(db, "activities", activityId));
      if (activityDoc.exists()) {
        setActivityName(activityDoc.data().activityName);
      }
    };
    fetchActivityName();
  }, [activityId]);

  useEffect(() => {
    const responsesRef = collection(
      db,
      "activities",
      activityId,
      "forms",
      "feedback",
      "responses"
    );
    const unsubscribe = onSnapshot(
      responsesRef,
      (snapshot) => {
        const feedbackData = [];
        let totalRating = 0;
        let ratingCount = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          const ratingField = data.responses
            ? Object.entries(data.responses).find(
                ([_, value]) => !isNaN(value) && value >= 1 && value <= 5
              )
            : null;
          const rating = ratingField ? parseInt(ratingField[1]) : null;

          if (rating) {
            totalRating += rating;
            ratingCount++;
          }

          feedbackData.push({
            id: doc.id,
            ...data,
            rating: rating,
            message: data.responses
              ? Object.entries(data.responses).find(
                  ([_, value]) => typeof value === "string" && value.length > 0
                )?.[1]
              : null,
            submittedAt: data.submittedAt?.toDate() || new Date(),
          });
        });

        // Sort by submission date (newest first)
        feedbackData.sort((a, b) => b.submittedAt - a.submittedAt);
        setResponses(feedbackData);
        setAverageRating(
          ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0
        );
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching responses:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activityId]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Add download CSV function
  const downloadCSV = () => {
    if (responses.length === 0) {
      toast.error("No data to download");
      return;
    }

    // Define CSV headers
    const headers = ["Name", "Email", "Rating", "Message", "Submitted At"];

    // Convert responses data to CSV format
    const csvData = responses.map((response) => {
      return [
        response.userName || "",
        response.userEmail || "",
        response.rating || "",
        response.message || "",
        response.submittedAt ? formatDate(response.submittedAt) : "",
      ].join(",");
    });

    // Combine headers and data
    const csv = [headers.join(","), ...csvData].join("\n");

    // Create and trigger download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `feedback_responses_${activityId}_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded successfully");
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{activityName}</h1>
          <p className="text-gray-600">Feedback Responses</p>
        </div>
        <Button
          onClick={downloadCSV}
          className="bg-black px-2 py-4 rounded-lg text-white flex items-center"
        >
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{responses.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Rating</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center">
            <p className="text-3xl font-bold mr-2">{averageRating}</p>
            <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
          </CardContent>
        </Card>
      </div>

      {responses.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left border-b">Name</th>
                <th className="py-3 px-4 text-left border-b">Email</th>
                <th className="py-3 px-4 text-left border-b">Rating</th>
                <th className="py-3 px-4 text-left border-b">Message</th>
                <th className="py-3 px-4 text-left border-b">Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((response) => (
                <tr key={response.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">
                    {response.userName || "N/A"}
                  </td>
                  <td className="py-3 px-4 border-b">
                    {response.userEmail || "N/A"}
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="flex items-center">
                      {response.rating}{" "}
                      <Star className="h-4 w-4 ml-1 text-yellow-400 fill-yellow-400" />
                    </div>
                  </td>
                  <td className="py-3 px-4 border-b max-w-md truncate">
                    {response.message || "No message"}
                  </td>
                  <td className="py-3 px-4 border-b">
                    {formatDate(response.submittedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">No feedback responses yet.</p>
      )}
    </div>
  );
};

export default FeedbackResponsesPage;
