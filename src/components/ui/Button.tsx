import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-honey-400 text-warmstone-white font-bold hover:bg-honey-600 shadow-[0_2px_8px_rgba(232,168,23,0.25)] disabled:opacity-60",
  secondary:
    "bg-sage-400 text-warmstone-white font-bold hover:bg-sage-600 disabled:opacity-60",
  ghost:
    "bg-transparent text-warmstone-800 border border-warmstone-200 hover:bg-warmstone-100 disabled:opacity-60",
  destructive:
    "bg-error-light text-error font-semibold hover:bg-red-100 disabled:opacity-60",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm min-h-[36px]",
  md: "px-6 py-3 text-base min-h-[44px]",
  lg: "px-8 py-4 text-lg min-h-[52px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className = "",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-md transition-colors cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? "w-full" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
