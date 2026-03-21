import { AlertTriangle, CheckCircle, Lightbulb, XCircle } from "lucide-react";
import { HTMLAttributes } from "react";

type AlertType = "info" | "warning" | "success" | "error";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  type?: AlertType;
  title?: string;
  description?: string;
}

const config: Record<AlertType, { icon: React.ElementType; bg: string; iconColor: string; titleColor: string }> = {
  info: { icon: Lightbulb, bg: "bg-info-light", iconColor: "text-info", titleColor: "text-info" },
  warning: { icon: AlertTriangle, bg: "bg-honey-50", iconColor: "text-honey-800", titleColor: "text-honey-800" },
  success: { icon: CheckCircle, bg: "bg-sage-50", iconColor: "text-sage-400", titleColor: "text-sage-400" },
  error: { icon: XCircle, bg: "bg-error-light", iconColor: "text-error", titleColor: "text-error" },
};

export function Alert({ type = "info", title, description, className = "", children, ...props }: AlertProps) {
  const { icon: Icon, bg, iconColor, titleColor } = config[type];
  return (
    <div
      className={["rounded-lg px-4 py-3.5 flex gap-3", bg, className].filter(Boolean).join(" ")}
      role="alert"
      {...props}
    >
      <Icon size={20} className={["shrink-0 mt-0.5", iconColor].join(" ")} />
      <div className="flex-1 min-w-0">
        {title && <p className={["font-bold text-sm", titleColor].join(" ")}>{title}</p>}
        {description && <p className="text-sm text-warmstone-800 mt-0.5">{description}</p>}
        {children}
      </div>
    </div>
  );
}
