"use client";

import { AlertTriangle, CheckCircle, Lightbulb, X, XCircle } from "lucide-react";
import type { Toast, ToastType } from "@/hooks/useToast";

const config: Record<ToastType, { icon: React.ElementType; bg: string; iconColor: string }> = {
  success: { icon: CheckCircle, bg: "bg-warmstone-white border-sage-200", iconColor: "text-sage-400" },
  error: { icon: XCircle, bg: "bg-warmstone-white border-error", iconColor: "text-error" },
  info: { icon: Lightbulb, bg: "bg-warmstone-white border-info", iconColor: "text-info" },
  warning: { icon: AlertTriangle, bg: "bg-warmstone-white border-honey-400", iconColor: "text-honey-800" },
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const { icon: Icon, bg, iconColor } = config[toast.type];
  return (
    <div
      className={[
        "flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border",
        "min-w-[280px] max-w-sm w-full",
        bg,
      ].join(" ")}
      role="alert"
    >
      <Icon size={18} className={["shrink-0 mt-0.5", iconColor].join(" ")} />
      <p className="flex-1 text-sm text-warmstone-800">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-warmstone-400 hover:text-warmstone-800 transition-colors shrink-0 min-h-[20px] min-w-[20px] flex items-center justify-center"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
