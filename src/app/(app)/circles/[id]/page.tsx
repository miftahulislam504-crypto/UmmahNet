"use client";

import { useParams, useRouter }    from "next/navigation";
import Link                        from "next/link";
import Image                       from "next/image";
import {
  Users, Lock, Globe, ArrowLeft,
  Loader2, Settings, UserCheck, UserPlus,
} from "lucide-react";
import { Button }                  from "@/components/ui/Button";
import { Avatar }                  from "@/components/ui/Avatar";
import { useCircle, useJoinCircle, useCircleMembers } from "@/hooks/useCircles";
import { useAuthStore }            from "@/store/authStore";
import { cn }                      from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  engineering: "Engineering", quran: "Quran", family: "Family",
  students: "Students", business: "Business", language: "Language",
  women: "Women", community: "Community", technology: "Technology",
  health: "Health", other: "Other",
};

export default function CircleDetailPage() {
  const { id }           = useParams<{ id: string }>();
  const router           = useRouter();
  const { user }         = useAuthStore();
  const { circle, loading } = useCircle(id);
  const { joined, role, join, leave } = useJoinCircle(circle ?? null);
  const { members }      = useCircleMembers(id);
  const isOwner          = circle?.ownerId === user?.uid;
  const isMod            = role === "moderator" || role === "owner";

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
    </div>
  );

  if (!circle) return (
    <div className="card p-12 text-center text-gray-500">Circle পাওয়া যায়নি</div>
  );

  return (
    <div className="flex flex-col gap-3">

      {/* Back nav */}
      <div className="card flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-200 transition-all"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-gray-100 flex-1 truncate">{circle.name}</h1>
        {isOwner && (
          <Link
            href={`/circles/${id}/settings`}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-200 transition-all"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <Settings className="w-5 h-5" />
          </Link>
        )}
      </div>

      {/* Hero card */}
      <div className="card overflow-hidden">
        {/* Cover */}
        <div
          className="relative h-36"
          style={{
            background: circle.coverPhoto
              ? undefined
              : "linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(30,27,75,0.6) 100%)",
          }}
        >
          {circle.coverPhoto && (
            <Image src={circle.coverPhoto} alt="" fill className="object-cover" />
          )}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(15,13,26,0.85) 100%)" }}
          />
        </div>

        <div className="px-4 pb-5 -mt-10">
          {/* Circle avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl mb-3
                       ring-2 ring-[rgba(15,13,26,0.9)] flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(159,103,250,0.2))",
              color:      "#c4b5fd",
            }}
          >
            {circle.avatarPhoto
              ? <Image src={circle.avatarPhoto} alt="" width={64} height={64} className="rounded-2xl" />
              : circle.name.charAt(0)
            }
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl text-gray-100">{circle.name}</h2>
                {circle.isPrivate
                  ? <Lock className="w-4 h-4 text-gray-500" />
                  : <Globe className="w-4 h-4 text-gray-600" />
                }
              </div>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">{circle.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  {circle.membersCount} members
                </span>
                {circle.activeNow > 0 && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {circle.activeNow} active
                  </span>
                )}
              </div>
            </div>

            {/* Join / Leave */}
            {user && !isOwner && (
              <div className="flex-shrink-0">
                {joined ? (
                  <Button
                    variant="ghost" size="sm"
                    loading={leave.isPending}
                    onClick={() => leave.mutate()}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Joined
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    loading={join.isPending}
                    onClick={() => join.mutate()}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {circle.isPrivate ? "Request" : "Join"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          {circle.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {circle.tags.map((tag) => (
                <span key={tag} className="badge">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Sub-nav */}
        <div className="flex border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {[
            { href: `/circles/${id}`,         label: "About"   },
            { href: `/circles/${id}/feed`,    label: "Posts"   },
            { href: `/circles/${id}/members`, label: "Members" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex-1 text-center py-3 text-sm font-semibold text-gray-500
                         hover:text-gray-300 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Members preview */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-300">সদস্যরা</h3>
          <Link
            href={`/circles/${id}/members`}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            সব দেখুন →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.slice(0, 12).map((m) => (
            <Link key={m.userId} href={`/profile/${m.userId}`}>
              <Avatar src={m.userPhoto} name={m.userName} size="sm"
                className="ring-1 hover:ring-primary-500 transition-all"
                style={{ "--tw-ring-color": "rgba(255,255,255,0.1)" } as React.CSSProperties}
              />
            </Link>
          ))}
          {circle.membersCount > 12 && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-gray-400"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              +{circle.membersCount - 12}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
