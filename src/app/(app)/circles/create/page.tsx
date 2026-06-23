"use client";
import React from "react";

import { useState }              from "react";
import { useRouter }             from "next/navigation";
import { ArrowLeft, Lock, Globe, Tag, X } from "lucide-react";
import { Button }                from "@/components/ui/Button";
import { Input }                 from "@/components/ui/Input";
import { useCreateCircle }       from "@/hooks/useCircles";
import type { CircleCategory }   from "@/types/circle";
import { cn }                    from "@/lib/utils";

const CATEGORIES: { value: CircleCategory; label: string; emoji: string }[] = [
  { value: "engineering", label: "Engineering", emoji: "⚙️" },
  { value: "quran",       label: "Quran Study", emoji: "📖" },
  { value: "family",      label: "Family",      emoji: "👨‍👩‍👧" },
  { value: "students",    label: "Students",    emoji: "🎓" },
  { value: "business",    label: "Business",    emoji: "💼" },
  { value: "language",    label: "Language",    emoji: "🌍" },
  { value: "women",       label: "Women",       emoji: "💜" },
  { value: "technology",  label: "Technology",  emoji: "💻" },
  { value: "health",      label: "Health",      emoji: "❤️" },
  { value: "community",   label: "Community",   emoji: "🏘️" },
  { value: "other",       label: "Other",       emoji: "✨" },
];

export default function CreateCirclePage() {
  const router       = useRouter();
  const createCircle = useCreateCircle();

  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState<CircleCategory>("engineering");
  const [isPrivate,   setIsPrivate]   = useState(false);
  const [tagInput,    setTagInput]    = useState("");
  const [tags,        setTags]        = useState<string[]>([]);

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  }

  function handleTagKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSubmit() {
    if (!name.trim() || !description.trim()) return;
    const id = await createCircle.mutateAsync({ name, description, category, isPrivate, tags });
    router.push(`/circles/${id}`);
  }

  const canSubmit = name.trim().length >= 3 && description.trim().length >= 10;

  return (
    <div className="flex flex-col gap-3">

      {/* Header */}
      <div className="card flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-200 transition-all"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-xl text-gray-100 flex-1">Circle তৈরি করুন</h1>
        <Button
          size="sm"
          loading={createCircle.isPending}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          তৈরি করুন
        </Button>
      </div>

      {/* Form */}
      <div className="card p-5 flex flex-col gap-5">

        {/* Name */}
        <Input
          label="Circle-এর নাম *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="যেমন: Civil Engineers BD"
          maxLength={60}
        />

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-400">বিবরণ *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="এই Circle কীসের জন্য?"
            rows={4}
            maxLength={500}
            className="input resize-none"
          />
          <p className="text-[11px] text-gray-600 text-right">{description.length}/500</p>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-400">Category *</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-medium
                           transition-all duration-200 active:scale-95"
                style={{
                  background: category === value ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                  border:     category === value
                    ? "1px solid rgba(124,58,237,0.4)"
                    : "1px solid rgba(255,255,255,0.06)",
                  color: category === value ? "#c4b5fd" : "#6b7280",
                }}
              >
                <span className="text-lg">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-400">Privacy</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: false, label: "Public",  desc: "যে কেউ যোগ দিতে পারবে",  icon: Globe },
              { value: true,  label: "Private", desc: "Approval লাগবে",          icon: Lock  },
            ].map(({ value, label, desc, icon: Icon }) => (
              <button
                key={String(value)}
                onClick={() => setIsPrivate(value)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-95"
                style={{
                  background: isPrivate === value ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                  border:     isPrivate === value
                    ? "1px solid rgba(124,58,237,0.35)"
                    : "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <Icon
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: isPrivate === value ? "#9f67fa" : "#6b7280" }}
                />
                <div>
                  <p className={cn("font-semibold text-sm", isPrivate === value ? "text-primary-300" : "text-gray-400")}>
                    {label}
                  </p>
                  <p className="text-[11px] text-gray-600">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-400">Tags (ঐচ্ছিক)</label>
          <div className="input flex flex-wrap gap-1.5 min-h-[44px] py-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg"
                style={{ background: "rgba(124,58,237,0.2)", color: "#c4b5fd" }}
              >
                #{tag}
                <button onClick={() => removeTag(tag)}>
                  <X className="w-3 h-3 text-gray-500 hover:text-gray-300" />
                </button>
              </span>
            ))}
            {tags.length < 8 && (
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                onBlur={addTag}
                placeholder={tags.length === 0 ? "tag লিখুন, Enter চাপুন…" : ""}
                className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none min-w-[80px]"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
