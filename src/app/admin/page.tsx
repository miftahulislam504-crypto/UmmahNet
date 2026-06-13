"use client";

import { useEffect, useState } from "react";
import { Users, FileText, Flag, TrendingUp, Loader2 } from "lucide-react";
import { getPlatformStats, getPendingReports } from "@/services/adminService";
import { formatDate } from "@/lib/utils";
import type { Report } from "@/services/adminService";

interface Stats {
  totalUsers:    number;
  totalPosts:    number;
  pendingReports: number;
}

export default function AdminDashboard() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPlatformStats(), getPendingReports()]).then(([s, r]) => {
      setStats(s);
      setReports(r.slice(0, 5));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const statCards = [
    { label: "মোট ব্যবহারকারী", value: stats?.totalUsers ?? 0,     icon: Users,     color: "bg-blue-500"   },
    { label: "মোট পোস্ট",       value: stats?.totalPosts ?? 0,     icon: FileText,  color: "bg-green-500"  },
    { label: "অপেক্ষারত রিপোর্ট", value: stats?.pendingReports ?? 0, icon: Flag,    color: "bg-red-500"    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ড্যাশবোর্ড</h1>
        <p className="text-sm text-gray-500 mt-0.5">UmmahNet পরিচালনা প্যানেল</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{label}</p>
              <div className={`${color} w-9 h-9 rounded-xl flex items-center justify-center`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value.toLocaleString("bn-BD")}</p>
          </div>
        ))}
      </div>

      {/* Recent reports */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">সাম্প্রতিক রিপোর্ট</h2>
        </div>
        {reports.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">কোনো অপেক্ষারত রিপোর্ট নেই</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {reports.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{r.reason}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.targetType} · {formatDate((r.createdAt as any)?.toDate?.() ?? new Date())}
                  </p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400
                                 px-2.5 py-1 rounded-full font-medium flex-shrink-0">
                  অপেক্ষারত
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
