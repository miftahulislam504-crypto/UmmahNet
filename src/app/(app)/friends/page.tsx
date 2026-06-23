"use client";
import React from "react";

import { useState } from "react";
import { Users, UserPlus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePendingRequests, useFriends } from "@/hooks/useFriends";
import { PendingRequestCard } from "@/components/friends/PendingRequestCard";
import { UserCard }           from "@/components/friends/UserCard";
import { FindPeopleTab }      from "@/components/friends/FindPeopleTab";
import { useAuthStore }       from "@/store/authStore";

type Tab = "requests" | "friends" | "find";

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("requests");
  const { data: pending }         = usePendingRequests();
  const { user }                  = useAuthStore();
  const { data: friendsData }     = useFriends(user?.uid);

  const tabs = [
    { id: "requests" as Tab, label: "রিকুয়েস্ট", icon: UserPlus, count: pending?.length },
    { id: "friends"  as Tab, label: "বন্ধু",      icon: Users },
    { id: "find"     as Tab, label: "মানুষ খুঁজুন", icon: Search },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">বন্ধু</h1>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg",
                "text-sm font-medium transition-all duration-200",
                activeTab === id
                  ? "bg-white dark:bg-gray-900 text-primary-600 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              {count !== undefined && count > 0 && (
                <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "requests" && (
        <div className="flex flex-col gap-3">
          {!pending || pending.length === 0 ? (
            <EmptyState icon={<UserPlus className="w-8 h-8 text-primary-400" />} title="কোনো ফ্রেন্ড রিকুয়েস্ট নেই" desc="নতুন রিকুয়েস্ট এখানে দেখাবে" />
          ) : (
            <>
              <p className="text-sm text-gray-500 px-1">{pending.length} request{pending.length !== 1 ? "s" : ""}</p>
              {pending.map((req) => <PendingRequestCard key={req.id} request={req} />)}
            </>
          )}
        </div>
      )}

      {activeTab === "friends" && (
        <div className="flex flex-col gap-3">
          {!friendsData || friendsData.friends.length === 0 ? (
            <EmptyState icon={<Users className="w-8 h-8 text-primary-400" />} title="এখনো কোনো বন্ধু নেই" desc="'মানুষ খুঁজুন' ট্যাবে গিয়ে বন্ধু যোগ করুন" />
          ) : (
            <>
              <p className="text-sm text-gray-500 px-1">{friendsData.friends.length} friend{friendsData.friends.length !== 1 ? "s" : ""}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {friendsData.friends.map((friend) => <UserCard key={friend.uid} user={friend} />)}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "find" && <FindPeopleTab />}
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">{icon}</div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </div>
  );
}
