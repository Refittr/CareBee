import { HTMLAttributes } from "react";

type BadgeVariant = "active" | "warning" | "error" | "neutral" | "info" | "owner";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  active: "bg-sage-50 text-sage-400",
  warning: "bg-honey-50 text-honey-800",
  error: "bg-error-light text-error",
  neutral: "bg-warmstone-100 text-warmstone-600",
  info: "bg-info-light text-info",
  owner: "bg-honey-50 text-honey-800",
};

export function Badge({ variant = "neutral", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-semibold",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
