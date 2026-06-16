"use client";

import { useEffect, useState } from "react";
import { Flag, CheckCircle, XCircle, Trash2, Loader2, ExternalLink, ShieldBan } from "lucide-react";
import Link from "next/link";
import { getPendingReports, resolveReport, adminDeletePost, adminDeleteComment, setBanStatus } from "@/services/adminService";
import { formatDate } from "@/lib/utils";
import type { Report } from "@/services/adminService";
import toast from "react-hot-toast";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState<string | null>(null);

  useEffect(() => {
    getPendingReports().then((r) => { setReports(r); setLoading(false); });
  }, []);

  // PHASE 6: generalized — `extra` performs the actual moderation action
  // (delete the reported post/comment, or ban the reported user) before the
  // report itself is marked resolved. Previously only "post" reports had a
  // real action (delete post); "user" and "comment" reports could only be
  // Resolved/Dismissed with no effect on the offending content/account.
  async function handleAction(
    reportId: string,
    action:   "resolved" | "dismissed",
    extra?:   { type: "deletePost" | "deleteComment" | "banUser"; targetId: string }
  ) {
    setActing(reportId);
    try {
      if (extra?.type === "deletePost")    await adminDeletePost(extra.targetId);
      if (extra?.type === "deleteComment") await adminDeleteComment(extra.targetId);
      if (extra?.type === "banUser")       await setBanStatus(extra.targetId, true);
      await resolveReport(reportId, action);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast.success(
        extra?.type === "banUser"   ? "User banned" :
        extra?.type === "deletePost" || extra?.type === "deleteComment" ? "Content removed" :
        action === "resolved" ? "Report resolved" : "Report dismissed"
      );
    } catch {
      toast.error("Action failed");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Report Review</h1>
        <p className="text-sm text-gray-500 mt-0.5">{reports.length} pending report{reports.length !== 1 ? "s" : ""}</p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-14 text-center">
          <Flag className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No pending reports</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {reports.map((r) => (
          <div key={r.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400
                                   px-2.5 py-1 rounded-full font-medium capitalize">
                    {r.targetType === "post" ? "Post" : r.targetType === "user" ? "User" : "Comment"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate((r.createdAt as any)?.toDate?.() ?? new Date())}
                  </span>
                </div>

                <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{r.reason}</p>
                <p className="text-xs text-gray-500">
                  Target ID: <span className="font-mono">{r.targetId.slice(0, 16)}...</span>
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {(r.targetType === "post" || r.targetType === "user") && (
                  <Link
                    href={r.targetType === "post" ? `/post/${r.targetId}` : `/profile/${r.targetId}`}
                    target="_blank"
                  >
                    <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </Link>
                )}

                {/* Delete post + resolve */}
                {r.targetType === "post" && (
                  <button
                    disabled={acting === r.id}
                    onClick={() => handleAction(r.id, "resolved", { type: "deletePost", targetId: r.targetId })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                               text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100
                               dark:hover:bg-red-900/30 transition-colors"
                  >
                    {acting === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete post
                  </button>
                )}

                {/* Delete comment + resolve — PHASE 6: comment reports previously had no action */}
                {r.targetType === "comment" && (
                  <button
                    disabled={acting === r.id}
                    onClick={() => handleAction(r.id, "resolved", { type: "deleteComment", targetId: r.targetId })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                               text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100
                               dark:hover:bg-red-900/30 transition-colors"
                  >
                    {acting === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete comment
                  </button>
                )}

                {/* Ban user + resolve — PHASE 6: user reports previously had no action */}
                {r.targetType === "user" && (
                  <button
                    disabled={acting === r.id}
                    onClick={() => handleAction(r.id, "resolved", { type: "banUser", targetId: r.targetId })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                               text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100
                               dark:hover:bg-red-900/30 transition-colors"
                  >
                    {acting === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldBan className="w-3.5 h-3.5" />}
                    Ban user
                  </button>
                )}

                {/* Resolve without deleting */}
                <button
                  disabled={acting === r.id}
                  onClick={() => handleAction(r.id, "resolved")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                             text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100
                             dark:hover:bg-green-900/30 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />Resolve
                </button>

                {/* Dismiss */}
                <button
                  disabled={acting === r.id}
                  onClick={() => handleAction(r.id, "dismissed")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                             text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200
                             dark:hover:bg-gray-700 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
