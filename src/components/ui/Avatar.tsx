import Image from "next/image";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  src?:      string | null;
  name:      string;
  size?:     "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: { outer: "w-8 h-8",   text: "text-xs" },
  md: { outer: "w-10 h-10", text: "text-sm" },
  lg: { outer: "w-14 h-14", text: "text-lg" },
  xl: { outer: "w-24 h-24", text: "text-2xl" },
};

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const s = sizes[size];

  if (src) {
    return (
      <div className={cn("relative rounded-full overflow-hidden flex-shrink-0", s.outer, className)}>
        <Image src={src} alt={name} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center flex-shrink-0 font-semibold",
        "bg-primary-100 text-primary-700",
        s.outer,
        s.text,
        className
      )}
    >
      {getInitials(name || "?")}
    </div>
  );
}
