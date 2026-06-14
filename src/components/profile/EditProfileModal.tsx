"use client";

import { useState, useRef } from "react";
import { X, Camera } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, auth } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/authStore";
import { Avatar }  from "@/components/ui/Avatar";
import { Input }   from "@/components/ui/Input";
import { Button }  from "@/components/ui/Button";
import type { UserProfile } from "@/types";
import toast from "react-hot-toast";

interface Props {
  profile: UserProfile;
  onClose: () => void;
}

// Image → Base64 (max 500px, quality 0.8)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 500;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function EditProfileModal({ profile, onClose }: Props) {
  const { setProfile } = useAuthStore();

  const [form, setForm] = useState({
    displayName: profile.displayName,
    username:    profile.username,
    bio:         profile.bio ?? "",
  });
  const [loading,    setLoading]    = useState(false);
  const [preview,    setPreview]    = useState<string>(profile.photoURL ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!form.displayName.trim()) return toast.error("Name cannot be empty");
    setLoading(true);

    try {
      let photoURL = profile.photoURL ?? "";

      // Convert to Base64 — no Firebase Storage needed
      if (avatarFile) {
        photoURL = await fileToBase64(avatarFile);
      }

      // Update Firebase Auth display name
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: form.displayName,
          ...(avatarFile ? { photoURL } : {}),
        });
      }

      const updates = {
        displayName: form.displayName.trim(),
        username:    form.username.trim(),
        bio:         form.bio.trim(),
        photoURL,
      };

      await updateDoc(doc(db, "users", profile.uid), updates);
      setProfile({ ...profile, ...updates });
      toast.success("Profile updated!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Update failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full sm:max-w-md p-6 shadow-2xl rounded-t-3xl sm:rounded-2xl">

        {/* Handle bar */}
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Avatar picker */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Avatar src={preview} name={form.displayName} size="xl" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8
                         bg-primary-600 hover:bg-primary-700
                         text-white rounded-full flex items-center justify-center
                         shadow-lg transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-4">
          <Input
            label="Full name"
            placeholder="Your name"
            value={form.displayName}
            onChange={set("displayName")}
          />
          <Input
            label="Username"
            placeholder="@username"
            value={form.username}
            onChange={set("username")}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
            <textarea
              value={form.bio}
              onChange={set("bio")}
              rows={3}
              placeholder="Tell people a little about yourself..."
              className="w-full bg-gray-100 dark:bg-gray-800 border border-transparent
                         focus:border-primary-500 focus:bg-white dark:focus:bg-gray-900
                         rounded-xl px-4 py-2.5 text-sm outline-none transition-all
                         duration-200 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1 justify-center">
            Cancel
          </Button>
          <Button loading={loading} onClick={handleSave} className="flex-1 justify-center">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
