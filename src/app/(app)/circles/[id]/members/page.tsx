"use client";

import { useParams }         from "next/navigation";
import Link                  from "next/link";
import { ArrowLeft, Crown, Shield, User } from "lucide-react";
import { Avatar }            from "@/components/ui/Avatar";
import { useCircle, useCircleMembers, useCircleMembership } from "@/hooks/useCircles";
import { useAuthStore }      from "@/store/authStore";
import { cn }                from "@/lib/utils";
import type { CircleMemberRole } from "@/types/circle";

const ROLE_META: Record<CircleMemberRole, { icon: typeof Crown; label: string; color: string }> = {
  owner:     { icon: Crown,  label: "Owner",    color: "#d97706" },
  moderator: { icon: Shield, label: "Mod",      color: "#60a5fa" },
  member:    { icon: User,   label: "Member",   color: "#6b7280" },
};

export default function CircleMembersPage() {
  const { id }              = useParams<{ id: string }>();
  const { user }            = useAuthStore();
  const { circle }          = useCircle(id);
  const { members, loading, promote } = useCircleMembers(id);
  const { role: myRole }    = useCircleMembership(id);
  const canManage           = myRole === "owner" || myRole === "moderator";

  return (
    <div className="flex flex-col gap-3">

      {/* Header */}
      <div className="card flex items-center gap-3 px-4 py-3">
        <Link
          href={`/circles/${id}`}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-200 transition-all"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-xs text-gray-500">Members</p>
          <h2 className="font-bold text-gray-100">{circle?.name}</h2>
        </div>
        <span className="ml-auto badge">{circle?.membersCount ?? 0}</span>
      </div>

      {/* Members list */}
      <div className="card divide-y divide-white/[0.06]">
        {loading && [1,2,3,4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="skeleton w-10 h-10 rounded-full" />
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="skeleton h-3 w-32 rounded" />
              <div className="skeleton h-2 w-20 rounded" />
            </div>
          </div>
        ))}

        {!loading && members.map((member) => {
          const roleMeta = ROLE_META[member.role];
          const isMe     = member.userId === user?.uid;

          return (
            <div key={member.id} className="flex items-center gap-3 px-4 py-3 group">
              <Link href={`/profile/${member.userId}`}>
                <Avatar src={member.userPhoto} name={member.userName} size="md" />
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/profile/${member.userId}`}>
                    <p className="font-semibold text-sm text-gray-100 hover:text-primary-300 transition-colors">
                      {member.userName}
                      {isMe && <span className="text-gray-600 font-normal ml-1">(আপনি)</span>}
                    </p>
                  </Link>
                  {/* Role badge */}
                  <span
                    className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{
                      color:      roleMeta.color,
                      background: `${roleMeta.color}18`,
                    }}
                  >
                    <roleMeta.icon className="w-2.5 h-2.5" />
                    {roleMeta.label}
                  </span>
                </div>
              </div>

              {/* Promote / demote — owner only, not for self */}
              {canManage && !isMe && member.role !== "owner" && (
                <button
                  onClick={() => promote.mutate({
                    userId: member.userId,
                    role:   member.role === "member" ? "moderator" : "member",
                  })}
                  disabled={promote.isPending}
                  className="opacity-0 group-hover:opacity-100 text-xs text-gray-500
                             hover:text-primary-400 transition-all px-2 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  {member.role === "member" ? "Mod বানান" : "Mod সরান"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
