import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  heading: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
  iconColor?: string;
}

export function EmptyState({
  icon: Icon,
  heading,
  description,
  ctaLabel,
  ctaHref,
  onCta,
  iconColor = "text-warmstone-400",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-4">
      <Icon size={48} className={iconColor} strokeWidth={1.5} />
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-bold text-warmstone-900">{heading}</h3>
        <p className="text-warmstone-600 text-sm max-w-xs">{description}</p>
      </div>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-2 bg-honey-400 text-warmstone-white font-bold rounded-md px-4 py-2 text-sm hover:bg-honey-600 transition-colors min-h-[44px] flex items-center"
        >
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCta && !ctaHref && (
        <Button onClick={onCta} className="mt-2">
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
