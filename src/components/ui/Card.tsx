import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  clickable?: boolean;
}

export function Card({ hoverable, clickable, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={[
        "bg-warmstone-white border border-warmstone-100 rounded-lg shadow-sm",
        hoverable || clickable ? "hover:shadow-md transition-shadow" : "",
        clickable ? "cursor-pointer" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={["px-5 pt-5 pb-3", className].join(" ")} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={["px-5 py-3", className].join(" ")} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "px-5 pt-3 pb-5 border-t border-warmstone-100",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
