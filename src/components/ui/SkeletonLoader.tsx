import { HTMLAttributes } from "react";

function SkeletonBlock({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["bg-warmstone-100 rounded animate-pulse", className].join(" ")}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-warmstone-white border border-warmstone-100 rounded-lg shadow-sm p-5 flex flex-col gap-3">
      <SkeletonBlock className="h-5 w-2/3" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-4/5" />
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 py-3">
      <SkeletonBlock className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <SkeletonBlock className="h-4 w-1/2" />
        <SkeletonBlock className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <SkeletonBlock className="h-8 w-1/3" />
      <SkeletonBlock className="h-5 w-2/3" />
      <div className="flex flex-col gap-3 mt-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

interface SkeletonLoaderProps {
  variant?: "card" | "list" | "page";
  count?: number;
}

export function SkeletonLoader({ variant = "card", count = 3 }: SkeletonLoaderProps) {
  if (variant === "page") return <SkeletonPage />;
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <div className="flex flex-col gap-3">
      {items.map((i) =>
        variant === "list" ? <SkeletonListItem key={i} /> : <SkeletonCard key={i} />
      )}
    </div>
  );
}
