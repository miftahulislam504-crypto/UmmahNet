"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { Input }  from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return toast.error("Please enter your email");

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
      toast.success("Reset link sent");
    } catch (err: any) {
      const msg =
        err.code === "auth/user-not-found"
          ? "No account found with this email"
          : "Failed to send, please try again";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <>
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Email sent
          </h2>
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>
            {" "}— a password reset link has been sent. Please check your inbox.
          </p>
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-primary-600 hover:underline font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        Reset password
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter your email and we'll send you a reset link
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="name@email.com"
          leftIcon={<Mail className="w-4 h-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button type="submit" loading={loading} className="w-full justify-center">
          Send reset link
        </Button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 mt-5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </Link>
    </>
  );
}
