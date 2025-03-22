"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function UserRegistrationPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const registerHandle = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { name, email, password } = formData;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(
        doc(db, "users", user.uid),
        {
          email,
          name,
          type: "user",
          userId: user.uid,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      router.push("/dashboard/user");
    } catch (err) {
      console.error("Error during registration:", err.message);
      setError(err.message);

      if (err.code === "auth/email-already-in-use") {
        setError("Email already in use. Please use a different email.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/weak-password") {
        setError("Password must be at least 6 characters long.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (err.code === "auth/invalid-password") {
        setError("Invalid password. Please enter a valid password.");
      } else {
        setError(err.code);
      }

      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 bg-white dark:bg-black shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.1)] transform hover:translate-y-[-2px] transition-all duration-300 ease-in-out border border-gray-200 dark:border-gray-800">
      <h2 className="font-bold text-xl text-neutral-800 dark:text-neutral-200">
        Create your account
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-2">
        Get registered to the exclusive portal!
      </p>

      <form className="my-8">
        <LabelInputContainer className="mb-4">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Your name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className="border-[#1CAC78] focus:border-[#1CAC78]"
          />
        </LabelInputContainer>

        <LabelInputContainer className="mb-4">
          <Label htmlFor="email">Email Address</Label>
          <div className="flex gap-2">
            <Input
              id="email"
              name="email"
              placeholder="your@email.com"
              required
              value={formData.email}
              onChange={handleChange}
              className="border-[#1CAC78] focus:border-[#1CAC78]"
            />
          </div>
        </LabelInputContainer>

        <LabelInputContainer className="mb-4">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              required
              value={formData.password}
              onChange={handleChange}
              className="border-[#1CAC78] focus:border-[#1CAC78]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-[50%] right-[10px] -translate-y-[50%] cursor-pointer"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </LabelInputContainer>

        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

        <button
          className={`relative group/btn ${
            loading ? "bg-gray-400" : "bg-[#1CAC78] hover:bg-[#18956A]"
          } w-full text-white rounded-md h-10 font-medium transition-colors duration-200 shadow-[0px_1px_0px_0px_#1CAC7840_inset,0px_-1px_0px_0px_#1CAC7840_inset]`}
          type="submit"
          disabled={loading}
          onClick={registerHandle}
        >
          {loading ? "Loading..." : "Register"}
          <BottomGradient />
        </button>

        <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent my-8 h-[1px] w-full" />

        <div className="flex flex-col space-y-4">
          <Link
            href="/register/ngo"
            className="text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 text-center"
          >
            Register as NGO
          </Link>

          <Link
            href="/login"
            className="relative group/btn flex space-x-2 items-center justify-center px-4 w-full text-black rounded-md h-10 font-medium shadow-input bg-gray-50 dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_var(--neutral-800)]"
          >
            <span className="text-neutral-700 dark:text-neutral-300 text-sm">
              Already have an account? Login
            </span>
            <BottomGradient />
          </Link>
        </div>
      </form>
    </div>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-[#1CAC78] to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-[#1CAC78] to-transparent" />
    </>
  );
};

const LabelInputContainer = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>
  );
};
