"use client";

import { useState } from "react";
import { X, Flag }  from "lucide-react";
import { Button }   from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { reportContent } from "@/services/advancedService";
import { cn }       from "@/lib/utils";
import toast        from "react-hot-toast";

const REASONS = [
  "স্প্যাম বা বিজ্ঞাপন",
  "ভুল তথ্য",
  "হয়রানি বা বুলিং",
  "ঘৃণামূলক বক্তব্য",
  "যৌন বা অশ্লীল কন্টেন্ট",
  "সহিংসতা",
  "অন্যান্য",
];

interface Props {
  targetId:   string;
  targetType: "post" | "comment" | "user";
  onClose:    () => void;
}

export function ReportModal({ targetId, targetType, onClose }: Props) {
  const { user }                = useAuthStore();
  const [reason,  setReason]   = useState("");
  const [loading, setLoading]  = useState(false);

  async function handleSubmit() {
    if (!reason || !user) return;
    setLoading(true);
    try {
      await reportContent({ reporterId: user.uid, targetId, targetType, reason });
      toast.success("রিপোর্ট জমা দেওয়া হয়েছে। ধন্যবাদ।");
      onClose();
    } catch {
      toast.error("রিপোর্ট জমা দেওয়া যায়নি");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />Report
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">সমস্যাটি কী?</p>

        <div className="flex flex-col gap-2 mb-6">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={cn(
                "text-left px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all",
                reason === r
                  ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600"
                  : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 justify-center">বাতিল</Button>
          <Button
            variant="danger"
            loading={loading}
            disabled={!reason}
            onClick={handleSubmit}
            className="flex-1 justify-center"
          >
            Submit report
          </Button>
        </div>
      </div>
    </div>
  );
}
