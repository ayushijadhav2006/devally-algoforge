"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  Users,
  Edit,
  Trash2,
  Bookmark,
  ArrowBigDown,
  MoveUpRight,
  Plus,
} from "lucide-react";
import { PayoutManagement } from "@/components/payout-management";
import Image from "next/image";

import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import {
  sendNotificationToUser,
  sendNotificationToNGO,
} from "@/lib/notificationService";
import { NOTIFICATION_TYPES } from "@/lib/notificationTypes";
import toast from "react-hot-toast";

export default function NGOActivitiesPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params["activity-id"];
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editedActivity, setEditedActivity] = useState(null);
  const user = auth.currentUser;
  const db = getFirestore();

  useEffect(() => {
    if (!activityId) return;

    const activityRef = doc(db, "activities", activityId);
    const unsubscribe = onSnapshot(
      activityRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const activityData = {
            id: snapshot.id,
            ...snapshot.data(),
          };
          setActivity(activityData);
          setEditedActivity(activityData);
        } else {
          setActivity(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching activity:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activityId, db]);

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const activityRef = doc(db, "activities", activityId);
      await updateDoc(activityRef, {
        eventName: editedActivity.eventName,
        tagline: editedActivity.tagline,
        shortDescription: editedActivity.shortDescription,
        additionalNotes: editedActivity.additionalNotes,
        location: editedActivity.location,
        eventDate: editedActivity.eventDate,
        participationDeadline: editedActivity.participationDeadline,
        contactEmail: editedActivity.contactEmail,
        feedbackEmailsSent: false,
        feedbackEmailsSentAt: null,
        endDate: editedActivity.eventDate,
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteDoc(doc(db, "activities", activityId));
      setIsDeleteDialogOpen(false);
      router.push("/dashboard/ngo/activities"); // Redirect to activities list
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  const handleBookmark = () => {
    console.log("Bookmark activity:", activity.id);
  };

  const handleActivityUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const activityRef = doc(db, "activities", activityId);

      // Update activity details
      await updateDoc(activityRef, {
        title: activityData.title,
        description: activityData.description,
        date: activityData.date,
        location: activityData.location,
        maxParticipants: activityData.maxParticipants,
        status: activityData.status,
        updatedAt: new Date(),
      });

      // Send notification to all participants
      const participantsSnapshot = await getDocs(
        collection(db, "activities", activityId, "participants")
      );
      for (const participant of participantsSnapshot.docs) {
        await sendNotificationToUser(participant.id, "ACTIVITY_UPDATED", {
          message: `The activity "${activityData.title}" has been updated`,
          customData: {
            activityId,
            activityTitle: activityData.title,
          },
        });
      }

      // Send notification to NGO members
      await sendNotificationToNGO(ngoId, "ACTIVITY_UPDATED", {
        message: `Activity "${activityData.title}" has been updated`,
        customData: {
          activityId,
          activityTitle: activityData.title,
        },
      });

      toast.success("Activity updated successfully");

      // Refresh activity data
      fetchActivityData();
    } catch (error) {
      console.error("Error updating activity:", error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivityCancellation = async () => {
    try {
      const activityRef = doc(db, "activities", activityId);

      // Update activity status
      await updateDoc(activityRef, {
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      });

      // Send notification to all participants
      const participantsSnapshot = await getDocs(
        collection(db, "activities", activityId, "participants")
      );
      for (const participant of participantsSnapshot.docs) {
        await sendNotificationToUser(participant.id, "ACTIVITY_CANCELLED", {
          message: `The activity "${activityData.title}" has been cancelled`,
          customData: {
            activityId,
            activityTitle: activityData.title,
          },
        });
      }

      // Send notification to NGO members
      await sendNotificationToNGO(ngoId, "ACTIVITY_CANCELLED", {
        message: `Activity "${activityData.title}" has been cancelled`,
        customData: {
          activityId,
          activityTitle: activityData.title,
        },
      });

      toast.success("Activity cancelled successfully");

      // Refresh activity data
      fetchActivityData();
    } catch (error) {
      console.error("Error cancelling activity:", error);
      toast.error(error.message);
    }
  };

  const handleActivityCompletion = async () => {
    try {
      const activityRef = doc(db, "activities", activityId);

      // Update activity status
      await updateDoc(activityRef, {
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      });

      // Send notification to all participants
      const participantsSnapshot = await getDocs(
        collection(db, "activities", activityId, "participants")
      );
      for (const participant of participantsSnapshot.docs) {
        await sendNotificationToUser(participant.id, "ACTIVITY_COMPLETED", {
          message: `The activity "${activityData.title}" has been completed`,
          customData: {
            activityId,
            activityTitle: activityData.title,
          },
        });
      }

      // Send notification to NGO members
      await sendNotificationToNGO(ngoId, "ACTIVITY_COMPLETED", {
        message: `Activity "${activityData.title}" has been completed`,
        customData: {
          activityId,
          activityTitle: activityData.title,
        },
      });

      toast.success("Activity marked as completed");

      // Refresh activity data
      fetchActivityData();
    } catch (error) {
      console.error("Error completing activity:", error);
      toast.error(error.message);
    }
  };

  if (!activity) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h2 className="text-2xl font-semibold">Event not found</h2>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto"
      >
        <Card className="overflow-hidden relative">
          <div className="relative h-96">
            <Image
              src={activity.featuredImageUrl || "/placeholder.svg"}
              alt={activity.eventName}
              layout="fill"
              objectFit="cover"
              className="absolute inset-0"
            />
          </div>
          <CardHeader>
            <div>
              <CardTitle className="text-3xl flex items-center justify-between">
                {activity.eventName}{" "}
                <div className="flex items-center space-x-2 text-gray-500">
                  {user?.uid === activity.ngoId && (
                    <>
                      {/* <Button
                        className="bg-[#1CAC78] hover:bg-[#158f63] "
                        // onClick={handleEdit}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Budget
                      </Button> */}
                      <Button
                        className="bg-[#1CAC78] hover:bg-[#158f63] "
                        onClick={handleEdit}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Edit Event
                      </Button>
                      <Button variant="destructive" onClick={handleDelete}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Event
                      </Button>
                    </>
                  )}
                  <Link
                    href={`/dashboard/ngo/activities/${activity.id}/forms`}
                    className="bg-white flex border-2 border-black items-center text-sm rounded-lg p-2 shadow-md"
                  >
                    <MoveUpRight className="mr-2 h-4 w-4" /> Manage Forms
                  </Link>
                </div>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center space-x-4 text-gray-500">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>{activity.eventDate}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>{activity.location}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>{activity.contactEmail}</span>
              </div>
            </div>
            <div className="space-y-4 text-gray-700">
              <p className="mb-2">
                <strong>Tagline:</strong> {activity.tagline}
              </p>
              <p className="mb-2">
                <strong>Description:</strong> {activity.shortDescription}
              </p>
              <p className="mb-2">
                <strong>Additional Notes:</strong> {activity.additionalNotes}
              </p>
              <p className="mb-2">
                <strong>Contact Email:</strong> {activity.contactEmail}
              </p>
              <p className="mb-2">
                <strong>Participation Deadline:</strong>{" "}
                {activity.participationDeadline}
              </p>
              <p className="mb-2">
                <strong>Category: </strong> {activity.category}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={editedActivity?.eventName || ""}
                onChange={(e) =>
                  setEditedActivity({
                    ...editedActivity,
                    eventName: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={editedActivity?.tagline || ""}
                onChange={(e) =>
                  setEditedActivity({
                    ...editedActivity,
                    tagline: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedActivity?.shortDescription || ""}
                onChange={(e) =>
                  setEditedActivity({
                    ...editedActivity,
                    shortDescription: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={editedActivity?.location || ""}
                onChange={(e) =>
                  setEditedActivity({
                    ...editedActivity,
                    location: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="eventDate">Event Date</Label>
              <Input
                id="eventDate"
                type="date"
                value={editedActivity?.eventDate || ""}
                onChange={(e) =>
                  setEditedActivity({
                    ...editedActivity,
                    eventDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deadline">Participation Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={editedActivity?.participationDeadline || ""}
                onChange={(e) =>
                  setEditedActivity({
                    ...editedActivity,
                    participationDeadline: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coordinator">Coordinator</Label>
              <Input
                id="coordinator"
                value={editedActivity?.coordinator || ""}
                onChange={(e) =>
                  setEditedActivity({
                    ...editedActivity,
                    coordinator: e.target.value,
                  })
                }
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                value={editedActivity?.contactEmail || ""}
                onChange={(e) =>
                  setEditedActivity({
                    ...editedActivity,
                    contactEmail: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} className="bg-[#1CAC78]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              activity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
