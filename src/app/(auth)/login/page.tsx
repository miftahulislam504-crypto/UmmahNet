"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { Input }  from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  loginWithEmail,
  loginWithGoogle,
  handleGoogleRedirectResult,
  waitForSessionCookie,
} from "@/services/authService";
import toast from "react-hot-toast";

// ─── Inner component — useSearchParams এখানে safe ────────────────────────────
function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const from         = searchParams.get("from") ?? "/";

  const [form, setForm]         = useState({ email: "", password: "" });
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);

  // ─── FIX: Google Redirect result handle ────────────────────────────────────
  // Mobile-এ signInWithRedirect ব্যবহার হয়।
  // Page reload হওয়ার পর এই useEffect redirect result চেক করে।
  useEffect(() => {
    setGLoading(true);
    handleGoogleRedirectResult()
      .then(async (user) => {
        if (user) {
          toast.success("স্বাগতম!");
          await waitForSessionCookie();
          router.push(from);
        }
      })
      .catch(() => toast.error("Google লগইন ব্যর্থ হয়েছে"))
      .finally(() => setGLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── FIX: Email login redirect ─────────────────────────────────────────────
  // waitForSessionCookie() — cookie set হওয়ার পর redirect।
  // আগে cookie set হওয়ার আগেই router.push() হত,
  // middleware session না পেয়ে আবার /login-এ পাঠাত।
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error("সব ঘর পূরণ করুন");

    setLoading(true);
    try {
      await loginWithEmail(form.email, form.password);
      toast.success("স্বাগতম! লগইন সফল হয়েছে");
      await waitForSessionCookie();
      router.push(from);
    } catch (err: any) {
      const msg =
        err.code === "auth/invalid-credential"
          ? "ইমেইল বা পাসওয়ার্ড ভুল"
          : "লগইন ব্যর্থ হয়েছে";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGLoading(true);
    try {
      // Desktop-এ popup — user সাথে সাথে পায়; redirect করা যায়।
      // Mobile-এ redirect — page চলে যাবে, useEffect handle করবে।
      await loginWithGoogle();

      // Desktop popup সফল হলেই এখানে আসবে
      toast.success("স্বাগতম!");
      await waitForSessionCookie();
      router.push(from);
    } catch (err: any) {
      // Mobile redirect হলে error আসে না — page চলে যায়
      // popup cancel হলে auth/popup-closed-by-user আসে
      if (err?.code !== "auth/popup-closed-by-user") {
        toast.error("Google লগইন ব্যর্থ হয়েছে");
      }
      setGLoading(false);
    }
    // Note: mobile redirect-এ finally চলে না — page reload হয়
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">আবার স্বাগতম!</h2>
      <p className="text-sm text-gray-500 mb-6">আপনার অ্যাকাউন্টে লগইন করুন</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="ইমেইল"
          type="email"
          placeholder="name@email.com"
          leftIcon={<Mail className="w-4 h-4" />}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="পাসওয়ার্ড"
          type="password"
          placeholder="••••••••"
          leftIcon={<Lock className="w-4 h-4" />}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-primary-600 hover:underline">
            পাসওয়ার্ড ভুলে গেছেন?
          </Link>
        </div>

        <Button type="submit" loading={loading} className="w-full justify-center">
          লগইন
        </Button>
      </form>

      <div className="flex items-center gap-3 my-4">
        <hr className="flex-1 border-gray-200 dark:border-gray-700" />
        <span className="text-xs text-gray-400">অথবা</span>
        <hr className="flex-1 border-gray-200 dark:border-gray-700" />
      </div>

      <button
        onClick={handleGoogle}
        disabled={gLoading}
        className="w-full flex items-center justify-center gap-3 border border-gray-200
                   dark:border-gray-700 rounded-xl py-2.5 text-sm font-medium
                   hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {gLoading ? (
          <span className="text-gray-500">লোড হচ্ছে...</span>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google দিয়ে লগইন
          </>
        )}
      </button>

      <p className="text-center text-sm text-gray-500 mt-6">
        নতুন ব্যবহারকারী?{" "}
        <Link href="/register" className="text-primary-600 font-semibold hover:underline">
          অ্যাকাউন্ট খুলুন
        </Link>
      </p>
    </>
  );
}

// ─── Page export — LoginForm কে Suspense দিয়ে wrap ────────────────────────────
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-10">
        <span className="text-gray-400 text-sm">লোড হচ্ছে...</span>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
