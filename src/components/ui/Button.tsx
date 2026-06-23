import { cn }      from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?:    "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "btn-primary",
  ghost:   "btn-ghost",
  outline: "btn-outline",
  danger:  "text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50",
};

const dangerStyle = {
  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "!px-3 !py-1.5 !text-xs !rounded-lg",
  md: "",
  lg: "!px-6 !py-3 !text-base",
};

export function Button({
  variant  = "primary",
  size     = "md",
  loading  = false,
  disabled,
  className,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "font-semibold transition-all duration-200 flex items-center gap-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      style={variant === "danger" ? { ...dangerStyle, ...style } : style}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
