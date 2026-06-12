"use client";

import { useState, useRef } from "react";
import { X, Camera } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { db, storage, auth } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/authStore";
import { Avatar }  from "@/components/ui/Avatar";
import { Input }   from "@/components/ui/Input";
import { Button }  from "@/components/ui/Button";
import type { UserProfile } from "@/types";
import toast from "react-hot-toast";

interface Props {
  profile:  UserProfile;
  onClose:  () => void;
}

export function EditProfileModal({ profile, onClose }: Props) {
  const { setProfile } = useAuthStore();

  const [form, setForm] = useState({
    displayName: profile.displayName,
    username:    profile.username,
    bio:         profile.bio,
  });
  const [loading,   setLoading]   = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview,   setPreview]   = useState<string>(profile.photoURL);

  const fileRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!form.displayName.trim()) return toast.error("নাম খালি রাখা যাবে না");
    setLoading(true);

    try {
      let photoURL = profile.photoURL;

      // Upload new avatar if selected
      if (avatarFile && auth.currentUser) {
        const storageRef = ref(storage, `avatars/${auth.currentUser.uid}`);
        await uploadBytes(storageRef, avatarFile);
        photoURL = await getDownloadURL(storageRef);
        await updateProfile(auth.currentUser, { displayName: form.displayName, photoURL });
      } else if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: form.displayName });
      }

      // Update Firestore
      const updates = {
        displayName: form.displayName,
        username:    form.username,
        bio:         form.bio,
        photoURL,
      };
      await updateDoc(doc(db, "users", profile.uid), updates);

      setProfile({ ...profile, ...updates });
      toast.success("প্রোফাইল আপডেট হয়েছে");
      onClose();
    } catch {
      toast.error("আপডেট ব্যর্থ হয়েছে");
    } finally {
      setLoading(false);
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">প্রোফাইল সম্পাদনা</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar picker */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Avatar src={preview} name={form.displayName} size="xl" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white
                         rounded-full flex items-center justify-center shadow-lg
                         hover:bg-primary-700 transition-colors"
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
            label="পুরো নাম"
            value={form.displayName}
            onChange={set("displayName")}
          />
          <Input
            label="ইউজারনেম"
            value={form.username}
            onChange={set("username")}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              বায়ো
            </label>
            <textarea
              value={form.bio}
              onChange={set("bio")}
              rows={3}
              placeholder="নিজের সম্পর্কে কিছু লিখুন..."
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
            বাতিল
          </Button>
          <Button loading={loading} onClick={handleSave} className="flex-1 justify-center">
            সংরক্ষণ করুন
          </Button>
        </div>
      </div>
    </div>
  );
}
