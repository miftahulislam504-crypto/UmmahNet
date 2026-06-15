"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Camera } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, auth } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/authStore";
import { Avatar }  from "@/components/ui/Avatar";
import { Input }   from "@/components/ui/Input";
import { Button }  from "@/components/ui/Button";
import { buildSearchTokens } from "@/lib/utils";
import toast from "react-hot-toast";

// Image → Base64 (max 500px, quality 0.8)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX   = 500;
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

export default function EditProfilePage() {
  const router              = useRouter();
  const { profile, setProfile } = useAuthStore();

  const [form, setForm] = useState({
    displayName: profile?.displayName ?? "",
    username:    profile?.username    ?? "",
    bio:         profile?.bio         ?? "",
  });
  const [loading,    setLoading]    = useState(false);
  const [preview,    setPreview]    = useState<string>(profile?.photoURL ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  if (!profile) return null;

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  async function handleSave() {
    if (!profile) return;
    if (!form.displayName.trim()) return toast.error("Name cannot be empty");
    setLoading(true);

    try {
      let photoURL = profile.photoURL ?? "";

      if (avatarFile) {
        photoURL = await fileToBase64(avatarFile);
      }

      if (auth.currentUser) {
        const isBase64 = photoURL.startsWith("data:");
        await updateProfile(auth.currentUser, {
          displayName: form.displayName,
          ...(!isBase64 ? { photoURL } : {}),
        });
      }

      const updates = {
        displayName:  form.displayName.trim(),
        username:     form.username.trim(),
        bio:          form.bio.trim(),
        photoURL,
        searchTokens: buildSearchTokens(form.displayName.trim(), form.username.trim()), // Phase 4
      };

      await updateDoc(doc(db, "users", profile.uid), updates);
      setProfile({ ...profile, ...updates });
      toast.success("Profile updated!");
      router.back();
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900
                      border-b border-gray-100 dark:border-gray-800
                      flex items-center justify-between px-4 h-14">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <h1 className="text-base font-bold text-gray-900 dark:text-white">Edit Profile</h1>
        <Button size="sm" loading={loading} onClick={handleSave}>
          Save
        </Button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 max-w-lg mx-auto w-full">

        {/* Avatar section */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {preview ? (
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4
                              ring-white dark:ring-gray-900 shadow-md">
                <Image src={preview} alt="Preview" fill className="object-cover" />
              </div>
            ) : (
              <Avatar
                src={null}
                name={form.displayName}
                size="xl"
                className="ring-4 ring-white dark:ring-gray-900 shadow-md"
              />
            )}

            {/* Camera button */}
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

          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Change photo
          </button>

          {avatarFile && (
            <p className="text-xs text-primary-600 font-medium">
              ✓ নতুন ছবি সিলেক্ট হয়েছে
            </p>
          )}
        </div>

        {/* Form fields */}
        <div className="card p-4 flex flex-col gap-4">
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
              rows={4}
              placeholder="Tell people a little about yourself..."
              className="w-full bg-gray-100 dark:bg-gray-800 border border-transparent
                         focus:border-primary-500 focus:bg-white dark:focus:bg-gray-900
                         rounded-xl px-4 py-2.5 text-sm outline-none transition-all
                         duration-200 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
