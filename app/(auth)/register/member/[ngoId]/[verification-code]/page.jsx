"use client";

import React, { useEffect, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  runTransaction,
  deleteField,
  getDoc,
} from "firebase/firestore";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Image from "next/image";

const MemberVerificationPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { ngoId, "verification-code": verificationCode } = useParams();
  const router = useRouter();
  const [memberData, setMemberData] = useState(null);

  useEffect(() => {
    if (!ngoId || !verificationCode) return;

    const fetchMemberData = async () => {
      try {
        const membersRef = collection(db, "ngo", ngoId, "members");
        const membersSnapshot = await getDocs(membersRef);

        let matchedMember = null;

        membersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.verificationCode === verificationCode) {
            matchedMember = { id: doc.id, ...data };
          }
        });

        if (matchedMember) {
          setMemberData(matchedMember);
          setEmail(matchedMember?.email || "");
          setError(null);
        } else {
          setError("Invalid verification code or NGO ID.");
        }
      } catch (error) {
        console.error("Error fetching member data:", error);
        setError("Failed to fetch member data. Please try again.");
      }
    };

    fetchMemberData();
  }, [ngoId, verificationCode]);

  const signUpHandler = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const memberRef = doc(db, "ngo", ngoId, "members", memberData.id);
      const userRef = doc(db, "users", user.uid);

      await runTransaction(db, async (transaction) => {
        const memberDoc = await transaction.get(memberRef);

        if (!memberDoc.exists()) {
          throw new Error("Member not found.");
        }

        const memberData = memberDoc.data();

        if (!memberData.verificationCode) {
          throw new Error("Verification code not found.");
        }

        // Update the member document
        transaction.update(memberRef, {
          status: "active",
          verificationCode: deleteField(),
          userId: user.uid,
        });

        // Create the user document with all necessary data
        transaction.set(userRef, {
          email: user.email,
          uid: user.uid,
          type: "ngo",
          role: "member",
          ngoId: ngoId,
          displayName: memberData.name || "",
          phoneNumber: memberData.phone || "",
          createdAt: new Date(),
          memberSince: new Date(),
          memberId: memberData.id,
          accessLevel: memberData.accessLevel,
        });
      });

      toast.success("Registration successful!");
      router.push("/dashboard/ngo");
    } catch (err) {
      console.error("Error during signup:", err);
      setError(err.message || "Failed to sign up. Please try again.");
      toast.error(err.code);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 bg-white transform hover:translate-y-[-2px] transition-all duration-300 ease-in-out border border-gray-200">
      <div className="flex flex-col items-center mb-6">
        <a
          href="https://yourorganizationwebsite.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/logo.jpg"
            alt="Logo Image"
            width={32}
            height={32}
            className="w-8 mb-4"
          />
        </a>
        <h2 className="font-bold text-xl text-neutral-800">
          Register as a Member
        </h2>
        <p className="text-neutral-600 text-sm mt-2">
          Welcome! Complete your registration to join this organization.
        </p>
      </div>

      <form className="my-8" onSubmit={signUpHandler}>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" value={email} disabled />
        </LabelInputContainer>

        <LabelInputContainer className="mb-4">
          <Label htmlFor="password">Create Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </LabelInputContainer>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          className="bg-gradient-to-br relative group/btn from-black to-neutral-600 block w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset]"
          type="submit"
          disabled={loading}
        >
          {loading ? "Registering..." : "Complete Registration"} &rarr;
          <BottomGradient />
        </button>

        <div className="bg-gradient-to-r from-transparent via-neutral-300 to-transparent my-8 h-[1px] w-full" />

        <div className="flex justify-center">
          <Link
            href="/sign-in"
            className="text-sm text-neutral-700 hover:text-neutral-900"
          >
            Already have an account?{" "}
            <span className="font-semibold">Sign In</span>
          </Link>
        </div>
      </form>
    </div>
  );
};

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
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

export default MemberVerificationPage;
