"use client";

import { Bookmark } from "lucide-react";

export default function SavedPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">সেভ করা পোস্ট</h1>
      </div>
      <div className="card p-14 text-center">
        <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bookmark className="w-8 h-8 text-primary-400" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">কোনো সেভ করা পোস্ট নেই</h3>
        <p className="text-sm text-gray-500">পোস্টের শেয়ার বাটনে সেভ অপশন শীঘ্রই আসছে</p>
      </div>
    </div>
  );
}
