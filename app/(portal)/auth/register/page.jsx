import { sendNotificationToUser } from "@/lib/notificationService";
import { NOTIFICATION_TYPES } from "@/lib/notificationTypes";
import toast from "react-hot-toast";

const handleRegister = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.email,
      formData.password
    );

    // Create user document
    await setDoc(doc(db, "users", userCredential.user.uid), {
      name: formData.name,
      email: formData.email,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: {
        phone: formData.phone,
        address: formData.address,
        bio: formData.bio,
      },
    });

    // Send welcome notification
    await sendNotificationToUser(userCredential.user.uid, "USER_REGISTRATION", {
      message:
        "Welcome to DevAlly! Your account has been created successfully.",
      customData: {
        name: formData.name,
      },
    });

    // Send email verification notification
    await sendNotificationToUser(
      userCredential.user.uid,
      "EMAIL_VERIFICATION",
      {
        message:
          "Please verify your email address to complete your registration.",
        customData: {
          email: formData.email,
        },
      }
    );

    toast.success("Account created successfully");

    router.push("/dashboard");
  } catch (error) {
    console.error("Error registering user:", error);
    toast.error(error.message);
  } finally {
    setIsLoading(false);
  }
};
