import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?:       string | null;
  name:       string;
  size?:      "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: { outer: "w-8 h-8"   },
  md: { outer: "w-10 h-10" },
  lg: { outer: "w-14 h-14" },
  xl: { outer: "w-24 h-24" },
};

// Default grey silhouette — no initials, no colors
function DefaultAvatar({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-full overflow-hidden flex-shrink-0 bg-gray-300 dark:bg-gray-600 flex items-end justify-center", className)}>
      <svg
        viewBox="0 0 80 80"
        className="w-[75%] h-[75%] text-gray-500 dark:text-gray-400"
        fill="currentColor"
      >
        {/* Head */}
        <circle cx="40" cy="28" r="18" />
        {/* Body */}
        <ellipse cx="40" cy="72" rx="28" ry="20" />
      </svg>
    </div>
  );
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const s = sizes[size];

  if (src) {
    return (
      <div className={cn("relative rounded-full overflow-hidden flex-shrink-0", s.outer, className)}>
        <Image src={src} alt={name} fill className="object-cover" />
      </div>
    );
  }

  return <DefaultAvatar className={cn(s.outer, className)} />;
}
