"use client";

import { useState } from "react";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db }           from "@/lib/firebase/config";
import { useAuthStore } from "@/store/authStore";
import { Button }       from "@/components/ui/Button";
import { Input }        from "@/components/ui/Input";
import { ShieldCheck, ShieldBan } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminSettingsPage() {
  const { user }                = useAuthStore();
  const [uid,     setUid]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function grantAdmin() {
    if (!uid.trim()) return;
    setLoading(true);
    try {
      await setDoc(doc(db, "admins", uid.trim()), {
        grantedBy: user?.uid,
        grantedAt: new Date(),
      });
      toast.success("Admin অ্যাক্সেস দেওয়া হয়েছে");
      setUid("");
    } catch {
      toast.error("ব্যর্থ হয়েছে");
    } finally {
      setLoading(false);
    }
  }

  async function revokeAdmin() {
    if (!uid.trim()) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "admins", uid.trim()));
      toast.success("Admin অ্যাক্সেস প্রত্যাহার করা হয়েছে");
      setUid("");
    } catch {
      toast.error("ব্যর্থ হয়েছে");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">অ্যাডমিন সেটিংস</h1>
      </div>

      {/* Admin management */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1">Admin অ্যাক্সেস পরিচালনা</h2>
        <p className="text-sm text-gray-500 mb-5">
          Firebase UID দিয়ে অন্য ব্যবহারকারীকে Admin করুন বা Admin থেকে সরান।
        </p>

        <div className="flex flex-col gap-4">
          <Input
            label="ব্যবহারকারীর Firebase UID"
            placeholder="uid এখানে দিন..."
            value={uid}
            onChange={(e) => setUid(e.target.value)}
          />
          <div className="flex gap-3">
            <Button
              loading={loading}
              onClick={grantAdmin}
              className="flex-1 justify-center"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin করুন
            </Button>
            <Button
              variant="danger"
              loading={loading}
              onClick={revokeAdmin}
              className="flex-1 justify-center"
            >
              <ShieldBan className="w-4 h-4" />
              Admin সরান
            </Button>
          </div>
        </div>

        <div className="mt-5 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            <strong>আপনার UID:</strong> {user?.uid}
          </p>
        </div>
      </div>

      {/* Firestore admins collection setup */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-2">প্রথমবার সেটআপ</h2>
        <p className="text-sm text-gray-500 mb-4">
          প্রথম Admin তৈরি করতে Firebase Console → Firestore-এ <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">admins</code> collection-এ আপনার UID দিয়ে একটি document তৈরি করুন।
        </p>
        <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs text-green-400">
          <p>Collection: admins</p>
          <p>Document ID: {"<your-firebase-uid>"}</p>
          <p>Fields: {`{ grantedBy: "self", grantedAt: timestamp }`}</p>
        </div>
      </div>
    </div>
  );
}
