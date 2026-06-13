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
      toast.success("Admin access granted");
      setUid("");
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(false);
    }
  }

  async function revokeAdmin() {
    if (!uid.trim()) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "admins", uid.trim()));
      toast.success("Admin access revoked");
      setUid("");
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Settings</h1>
      </div>

      {/* Admin management */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-1">Manage Admin Access</h2>
        <p className="text-sm text-gray-500 mb-5">
          Grant or revoke admin access for another user by their Firebase UID.
        </p>

        <div className="flex flex-col gap-4">
          <Input
            label="User's Firebase UID"
            placeholder="Enter UID here..."
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
              Grant admin
            </Button>
            <Button
              variant="danger"
              loading={loading}
              onClick={revokeAdmin}
              className="flex-1 justify-center"
            >
              <ShieldBan className="w-4 h-4" />
              Revoke admin
            </Button>
          </div>
        </div>

        <div className="mt-5 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            <strong>Your UID:</strong> {user?.uid}
          </p>
        </div>
      </div>

      {/* Firestore admins collection setup */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-2">First-time Setup</h2>
        <p className="text-sm text-gray-500 mb-4">
          To create the first Admin, go to Firebase Console → Firestore, then create a document in the <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">admins</code> collection using your UID.
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
