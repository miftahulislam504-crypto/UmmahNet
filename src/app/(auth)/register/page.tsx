"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, AtSign } from "lucide-react";
import { Input }  from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { registerWithEmail, loginWithGoogle } from "@/services/authService";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: "",
    username:    "",
    email:       "",
    password:    "",
    confirm:     "",
  });
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.displayName.trim()) e.displayName = "নাম দিন";
    if (!form.username.trim())    e.username    = "ইউজারনেম দিন";
    if (!/^[a-z0-9_]+$/.test(form.username))
      e.username = "শুধু a-z, 0-9, _ ব্যবহার করুন";
    if (!form.email.trim())       e.email    = "ইমেইল দিন";
    if (form.password.length < 6) e.password = "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর";
    if (form.password !== form.confirm) e.confirm = "পাসওয়ার্ড মিলছে না";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await registerWithEmail(form.email, form.password, form.displayName, form.username);
      toast.success("অ্যাকাউন্ট তৈরি হয়েছে! স্বাগতম 🎉");
      router.push("/");
    } catch (err: any) {
      const msg =
        err.code === "auth/email-already-in-use"
          ? "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে"
          : "অ্যাকাউন্ট তৈরি ব্যর্থ হয়েছে";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGLoading(true);
    try {
      await loginWithGoogle();
      toast.success("স্বাগতম!");
      router.push("/");
    } catch {
      toast.error("Google লগইন ব্যর্থ হয়েছে");
    } finally {
      setGLoading(false);
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">অ্যাকাউন্ট খুলুন</h2>
      <p className="text-sm text-gray-500 mb-6">UmmahNet-এ যোগ দিন</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="পুরো নাম"
          placeholder="আপনার নাম"
          leftIcon={<User className="w-4 h-4" />}
          value={form.displayName}
          onChange={set("displayName")}
          error={errors.displayName}
        />
        <Input
          label="ইউজারনেম"
          placeholder="username (a-z, 0-9, _)"
          leftIcon={<AtSign className="w-4 h-4" />}
          value={form.username}
          onChange={set("username")}
          error={errors.username}
        />
        <Input
          label="ইমেইল"
          type="email"
          placeholder="name@email.com"
          leftIcon={<Mail className="w-4 h-4" />}
          value={form.email}
          onChange={set("email")}
          error={errors.email}
        />
        <Input
          label="পাসওয়ার্ড"
          type="password"
          placeholder="কমপক্ষে ৬ অক্ষর"
          leftIcon={<Lock className="w-4 h-4" />}
          value={form.password}
          onChange={set("password")}
          error={errors.password}
        />
        <Input
          label="পাসওয়ার্ড নিশ্চিত করুন"
          type="password"
          placeholder="আবার পাসওয়ার্ড দিন"
          leftIcon={<Lock className="w-4 h-4" />}
          value={form.confirm}
          onChange={set("confirm")}
          error={errors.confirm}
        />

        <Button type="submit" loading={loading} className="w-full justify-center mt-1">
          অ্যাকাউন্ট তৈরি করুন
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
            Google দিয়ে যোগ দিন
          </>
        )}
      </button>

      <p className="text-center text-sm text-gray-500 mt-6">
        আগে থেকেই অ্যাকাউন্ট আছে?{" "}
        <Link href="/login" className="text-primary-600 font-semibold hover:underline">
          লগইন করুন
        </Link>
      </p>
    </>
  );
}
