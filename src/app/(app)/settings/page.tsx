"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { db, auth } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/authStore";
import { logout } from "@/services/authService";
import { Button } from "@/components/ui/Button";
import { Input  } from "@/components/ui/Input";
import {
  Globe, Users, Lock, Shield, Bell, ChevronRight, ChevronLeft, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { UserProfile } from "@/types";

type Section = "privacy" | "password" | "notifications";

const sections: { id: Section; label: string; desc: string; icon: typeof Shield }[] = [
  { id: "privacy",       label: "Privacy",       desc: "Control who sees your profile", icon: Shield },
  { id: "password",      label: "Password",      desc: "Change your account password",  icon: Lock   },
  { id: "notifications", label: "Notifications", desc: "Manage notification preferences", icon: Bell  },
];

export default function SettingsPage() {
  const { profile, setProfile }     = useAuthStore();
  const [section, setSection]       = useState<Section | null>(null);
  const router                      = useRouter();

  async function handleLogout() {
    await logout();
    toast.success("Logged out successfully");
    router.push("/login");
  }

  if (!profile) return null;

  // If a section is open, show it full-screen (mobile style)
  if (section) {
    return (
      <div className="flex flex-col gap-4">
        {/* Back header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSection(null)}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800
                       text-gray-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            {sections.find((s) => s.id === section)?.label}
          </h1>
        </div>

        {section === "privacy"       && <PrivacySection       profile={profile} setProfile={setProfile} />}
        {section === "password"      && <PasswordSection />}
        {section === "notifications" && <NotifSection />}
      </div>
    );
  }

  // Settings menu list
  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="card overflow-hidden">
        {sections.map(({ id, label, desc, icon: Icon }, i) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-4 text-left",
              "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
              i > 0 && "border-t border-gray-100 dark:border-gray-800"
            )}
          >
            <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-900/20
                            flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Log out */}
      <div className="card overflow-hidden">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-4 text-left
                     hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-900/20
                          flex items-center justify-center flex-shrink-0">
            <LogOut className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-500">Log out</p>
            <p className="text-xs text-gray-500 mt-0.5">Sign out of your account</p>
          </div>
        </button>
      </div>

      {/* App info */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-600 pb-2">
        UmmahNet · Version 1.0.0
      </p>
    </div>
  );
}

// ─── Privacy ──────────────────────────────────────────────────────────────────
function PrivacySection({
  profile,
  setProfile,
}: {
  profile:    UserProfile;
  setProfile: (p: UserProfile) => void;
}) {
  const [saving,  setSaving]  = useState(false);
  const [privacy, setPrivacy] = useState(profile.privacySetting);

  const options: {
    value: UserProfile["privacySetting"];
    label: string;
    desc:  string;
    icon:  typeof Globe;
  }[] = [
    { value: "public",  label: "Public",       desc: "Anyone can see your profile",         icon: Globe },
    { value: "friends", label: "Friends only",  desc: "Only your friends can see your profile", icon: Users },
    { value: "private", label: "Private",       desc: "Only you can see your profile",       icon: Lock  },
  ];

  async function save() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), { privacySetting: privacy });
      setProfile({ ...profile, privacySetting: privacy });
      toast.success("Privacy setting updated");
    } catch {
      toast.error("Update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500 mb-4">
        Choose who can view your profile and posts.
      </p>
      <div className="flex flex-col gap-3 mb-6">
        {options.map(({ value, label, desc, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer border-2 transition-all",
              privacy === value
                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                : "border-transparent bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
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
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                privacy === value
                  ? "bg-primary-600 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-400"
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </label>
        ))}
      </div>
      <Button loading={saving} onClick={save} className="w-full justify-center">
        Save changes
      </Button>
    </div>
  );
}

// ─── Password ─────────────────────────────────────────────────────────────────
function PasswordSection() {
  const [form,   setForm]   = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.current || !form.next || !form.confirm)
      return toast.error("Please fill in all fields");
    if (form.next.length < 6)
      return toast.error("New password must be at least 6 characters");
    if (form.next !== form.confirm)
      return toast.error("Passwords do not match");

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error();
      const cred = EmailAuthProvider.credential(user.email, form.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, form.next);
      toast.success("Password updated successfully");
      setForm({ current: "", next: "", confirm: "" });
    } catch {
      toast.error("Current password is incorrect");
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500 mb-5">
        Enter your current password to set a new one.
      </p>
      <div className="flex flex-col gap-4">
        <Input
          label="Current password"
          type="password"
          placeholder="Enter current password"
          value={form.current}
          onChange={set("current")}
        />
        <Input
          label="New password"
          type="password"
          placeholder="At least 6 characters"
          value={form.next}
          onChange={set("next")}
        />
        <Input
          label="Confirm new password"
          type="password"
          placeholder="Repeat new password"
          value={form.confirm}
          onChange={set("confirm")}
        />
        <Button loading={saving} onClick={save} className="w-full justify-center mt-1">
          Update password
        </Button>
      </div>
    </div>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────
function NotifSection() {
  const rows = [
    { label: "New friend requests",    desc: "When someone sends you a friend request" },
    { label: "Friend request accepted",desc: "When someone accepts your request"       },
    { label: "Post likes",             desc: "When someone likes your post"            },
    { label: "Comments",               desc: "When someone comments on your post"      },
    { label: "Mentions",               desc: "When someone mentions you in a post"     },
    { label: "Messages",               desc: "When you receive a new message"          },
  ];

  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(rows.map((r) => [r.label, true]))
  );

  function toggle(label: string) {
    setEnabled((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <p className="text-sm text-gray-500">
          Push notifications are coming soon. Preview your preferences below.
        </p>
      </div>
      {rows.map(({ label, desc }, i) => (
        <div
          key={label}
          className={cn(
            "flex items-center gap-4 px-5 py-4",
            i > 0 && "border-t border-gray-100 dark:border-gray-800"
          )}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </div>
          {/* Toggle switch */}
          <button
            onClick={() => toggle(label)}
            aria-label={`Toggle ${label}`}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0",
              enabled[label]
                ? "bg-primary-600"
                : "bg-gray-200 dark:bg-gray-700"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm",
                "transition-all duration-200",
                enabled[label] ? "left-5" : "left-0.5"
              )}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
