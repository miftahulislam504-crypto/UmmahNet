"use client";

import Link  from "next/link";
import Image from "next/image";
import { Users, Lock, Globe } from "lucide-react";
import { cn }     from "@/lib/utils";
import type { Circle } from "@/types/circle";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  engineering: { bg: "rgba(96,165,250,0.12)",  text: "#60a5fa", border: "rgba(96,165,250,0.25)"  },
  quran:       { bg: "rgba(52,211,153,0.12)",  text: "#34d399", border: "rgba(52,211,153,0.25)"  },
  family:      { bg: "rgba(244,114,182,0.12)", text: "#f472b6", border: "rgba(244,114,182,0.25)" },
  students:    { bg: "rgba(167,139,250,0.12)", text: "#a78bfa", border: "rgba(167,139,250,0.25)" },
  business:    { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b", border: "rgba(245,158,11,0.25)"  },
  language:    { bg: "rgba(251,146,60,0.12)",  text: "#fb923c", border: "rgba(251,146,60,0.25)"  },
  women:       { bg: "rgba(244,114,182,0.12)", text: "#f472b6", border: "rgba(244,114,182,0.25)" },
  community:   { bg: "rgba(52,211,153,0.12)",  text: "#34d399", border: "rgba(52,211,153,0.25)"  },
  technology:  { bg: "rgba(96,165,250,0.12)",  text: "#60a5fa", border: "rgba(96,165,250,0.25)"  },
  health:      { bg: "rgba(52,211,153,0.12)",  text: "#34d399", border: "rgba(52,211,153,0.25)"  },
  other:       { bg: "rgba(124,58,237,0.12)",  text: "#9f67fa", border: "rgba(124,58,237,0.25)"  },
};

const CATEGORY_LABELS: Record<string, string> = {
  engineering: "Engineering",
  quran:       "Quran",
  family:      "Family",
  students:    "Students",
  business:    "Business",
  language:    "Language",
  women:       "Women",
  community:   "Community",
  technology:  "Technology",
  health:      "Health",
  other:       "Other",
};

interface Props {
  circle:  Circle & { id: string };
  variant?: "grid" | "list";
}

export function CircleCard({ circle, variant = "grid" }: Props) {
  const colors = CATEGORY_COLORS[circle.category] ?? CATEGORY_COLORS.other;

  if (variant === "list") {
    return (
      <Link
        href={`/circles/${circle.id}`}
        className="card flex items-center gap-3 px-4 py-3 hover:border-primary-600/30 transition-all group"
      >
        <CircleAvatar circle={circle} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-gray-100 truncate group-hover:text-primary-300 transition-colors">
              {circle.name}
            </p>
            {circle.isPrivate
              ? <Lock className="w-3 h-3 text-gray-500 flex-shrink-0" />
              : <Globe className="w-3 h-3 text-gray-600 flex-shrink-0" />
            }
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">{circle.description}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[11px] text-gray-600">
              <Users className="w-3 h-3" />
              {circle.membersCount}
            </span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{ color: colors.text, background: colors.bg }}
            >
              {CATEGORY_LABELS[circle.category]}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Grid card
  return (
    <Link href={`/circles/${circle.id}`} className="block group">
      <div
        className="card overflow-hidden transition-all duration-300 hover:translate-y-[-4px]"
        style={{ animationDelay: "0ms" }}
      >
        {/* Cover */}
        <div
          className="relative h-24 w-full"
          style={{
            background: circle.coverPhoto
              ? undefined
              : `linear-gradient(135deg, ${colors.bg.replace("0.12", "0.4")} 0%, rgba(15,13,26,0.6) 100%)`,
          }}
        >
          {circle.coverPhoto && (
            <Image src={circle.coverPhoto} alt="" fill className="object-cover" />
          )}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(15,13,26,0.8) 100%)" }}
          />
        </div>

        {/* Avatar overlapping cover */}
        <div className="px-4 pt-0 pb-4 -mt-8">
          <CircleAvatar circle={circle} size={52} className="mb-2 ring-2"
            style={{ "--tw-ring-color": "rgba(15,13,26,0.9)" } as React.CSSProperties} />

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-[14px] text-gray-100 truncate group-hover:text-primary-300 transition-colors">
                  {circle.name}
                </h3>
                {circle.isPrivate && <Lock className="w-3 h-3 text-gray-500 flex-shrink-0" />}
              </div>
              <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                {circle.description}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-[12px] text-gray-500">
              <Users className="w-3.5 h-3.5" />
              <span>{circle.membersCount} members</span>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
              style={{
                color:      colors.text,
                background: colors.bg,
                border:     `1px solid ${colors.border}`,
              }}
            >
              {CATEGORY_LABELS[circle.category]}
            </span>
          </div>

          {/* Active now indicator */}
          {circle.activeNow > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "#10b981" }}
              />
              <span className="text-[11px] text-emerald-500">
                {circle.activeNow} active now
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Shared avatar component ──────────────────────────────────────────────────
function CircleAvatar({
  circle, size, className, style,
}: {
  circle:    Circle & { id: string };
  size:      number;
  className?: string;
  style?:    React.CSSProperties;
}) {
  const colors  = CATEGORY_COLORS[circle.category] ?? CATEGORY_COLORS.other;
  const initial = circle.name.charAt(0).toUpperCase();

  return (
    <div
      className={cn("rounded-2xl overflow-hidden flex-shrink-0", className)}
      style={{ width: size, height: size, ...style }}
    >
      {circle.avatarPhoto ? (
        <Image src={circle.avatarPhoto} alt={circle.name} width={size} height={size} className="object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-bold text-lg"
          style={{
            background: `linear-gradient(135deg, ${colors.text}30 0%, ${colors.text}15 100%)`,
            color:       colors.text,
            border:     `1px solid ${colors.border}`,
          }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
