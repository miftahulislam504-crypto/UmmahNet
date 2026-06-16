"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, ShieldBan, ShieldCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getAllUsers, adminSearchUsers, setBanStatus } from "@/services/adminService";
import { Avatar }  from "@/components/ui/Avatar";
import { Button }  from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { UserProfile } from "@/types";
import toast from "react-hot-toast";

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [acting,  setActing]  = useState<string | null>(null);

  useEffect(() => {
    getAllUsers().then((u) => { setUsers(u); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!search.trim()) { getAllUsers().then(setUsers); return; }
    const t = setTimeout(() => adminSearchUsers(search).then(setUsers), 400);
    return () => clearTimeout(t);
  }, [search]);

  async function toggleBan(user: UserProfile) {
    setActing(user.uid);
    try {
      await setBanStatus(user.uid, !user.isBlocked);
      setUsers((prev) => prev.map((u) => u.uid === user.uid ? { ...u, isBlocked: !u.isBlocked } : u));
      toast.success(user.isBlocked ? "ব্যান তুলে নেওয়া হয়েছে" : "ইউজার ব্যান করা হয়েছে");
    } catch {
      toast.error("কাজটি ব্যর্থ হয়েছে");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ইউজার</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} registered</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ইউজারনেম দিয়ে খুঁজুন..."
          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
                     rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary-500 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">ইউজার</th>
                  <th className="px-5 py-3 text-left">ইউজারনেম</th>
                  <th className="px-5 py-3 text-left">পোস্ট</th>
                  <th className="px-5 py-3 text-left">যোগদান</th>
                  <th className="px-5 py-3 text-left">স্ট্যাটাস</th>
                  <th className="px-5 py-3 text-left">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.photoURL} name={u.displayName} size="sm" />
                        <p className="font-medium text-gray-900 dark:text-white">{u.displayName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">@{u.username}</td>
                    <td className="px-5 py-3 text-gray-500">{u.postsCount}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {formatDate((u.createdAt as any)?.toDate?.() ?? new Date())}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                        ${u.isBlocked
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {u.isBlocked ? "ব্যানড" : "সক্রিয়"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/profile/${u.uid}`} target="_blank">
                          <button className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => toggleBan(u)}
                          disabled={acting === u.uid}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.isBlocked
                              ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                              : "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          }`}
                        >
                          {acting === u.uid
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : u.isBlocked
                              ? <ShieldCheck className="w-4 h-4" />
                              : <ShieldBan className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
