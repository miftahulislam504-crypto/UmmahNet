"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { db, auth } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Input  } from "@/components/ui/Input";
import { Globe, Users, Lock, Shield, Bell, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { UserProfile } from "@/types";

type Section = "privacy" | "password" | "notifications";

export default function SettingsPage() {
  const { profile, setProfile } = useAuthStore();
  const [section, setSection]   = useState<Section>("privacy");

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">সেটিংস</h1>
      </div>

      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="card p-2 w-48 flex-shrink-0 self-start">
          {[
            { id: "privacy"       as Section, label: "গোপনীয়তা",    icon: Shield },
            { id: "password"      as Section, label: "পাসওয়ার্ড",   icon: Lock   },
            { id: "notifications" as Section, label: "নোটিফিকেশন",  icon: Bell   },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                section === id
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {section === "privacy"       && <PrivacySection profile={profile} setProfile={setProfile} />}
          {section === "password"      && <PasswordSection />}
          {section === "notifications" && <NotifSection />}
        </div>
      </div>
    </div>
  );
}

// ─── Privacy ──────────────────────────────────────────────────────────────────
function PrivacySection({
  profile,
  setProfile,
}: {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [privacy, setPrivacy] = useState(profile.privacySetting);

  const options: { value: UserProfile["privacySetting"]; label: string; desc: string; icon: typeof Globe }[] = [
    { value: "public",  label: "পাবলিক",    desc: "সবাই আপনার প্রোফাইল দেখতে পাবে",      icon: Globe },
    { value: "friends", label: "বন্ধুরা",   desc: "শুধু বন্ধুরা আপনার প্রোফাইল দেখবে",  icon: Users },
    { value: "private", label: "প্রাইভেট", desc: "শুধু আপনি নিজে দেখতে পাবেন",         icon: Lock  },
  ];

  async function save() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), { privacySetting: privacy });
      setProfile({ ...profile, privacySetting: privacy });
      toast.success("গোপনীয়তা সেটিং আপডেট হয়েছে");
    } catch {
      toast.error("আপডেট ব্যর্থ হয়েছে");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4">প্রোফাইল গোপনীয়তা</h2>
      <div className="flex flex-col gap-3 mb-6">
        {options.map(({ value, label, desc, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all",
              privacy === value
                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <input
              type="radio"
              name="privacy"
              value={value}
              checked={privacy === value}
              onChange={() => setPrivacy(value)}
              className="sr-only"
            />
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
              privacy === value ? "bg-primary-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          </label>
        ))}
      </div>
      <Button loading={saving} onClick={save}>সংরক্ষণ করুন</Button>
    </div>
  );
}

// ─── Password ─────────────────────────────────────────────────────────────────
function PasswordSection() {
  const [form, setForm]   = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.current || !form.next) return toast.error("সব ঘর পূরণ করুন");
    if (form.next.length < 6)        return toast.error("কমপক্ষে ৬ অক্ষর");
    if (form.next !== form.confirm)  return toast.error("পাসওয়ার্ড মিলছে না");

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error();
      const cred = EmailAuthProvider.credential(user.email, form.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, form.next);
      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে");
      setForm({ current: "", next: "", confirm: "" });
    } catch {
      toast.error("বর্তমান পাসওয়ার্ড ভুল অথবা অন্য সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="card p-6">
      <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4">পাসওয়ার্ড পরিবর্তন</h2>
      <div className="flex flex-col gap-4 max-w-sm">
        <Input label="বর্তমান পাসওয়ার্ড" type="password" value={form.current} onChange={set("current")} />
        <Input label="নতুন পাসওয়ার্ড"    type="password" value={form.next}    onChange={set("next")}    />
        <Input label="নিশ্চিত করুন"       type="password" value={form.confirm} onChange={set("confirm")} />
        <Button loading={saving} onClick={save}>পাসওয়ার্ড পরিবর্তন করুন</Button>
      </div>
    </div>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────
function NotifSection() {
  return (
    <div className="card p-6">
      <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4">নোটিফিকেশন সেটিং</h2>
      <p className="text-sm text-gray-500">শীঘ্রই আসছে — Push Notification সেটিংস এখানে থাকবে।</p>
    </div>
  );
}
