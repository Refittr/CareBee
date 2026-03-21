import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, SelectHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-warmstone-800">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "bg-warmstone-100 border border-warmstone-200 rounded-sm text-warmstone-800",
            "placeholder:text-warmstone-400 px-3 py-2.5 min-h-[44px]",
            "focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400",
            "transition-colors w-full text-base",
            error ? "border-error focus:ring-red-200 focus:border-error" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        {hint && !error && <p className="text-xs text-warmstone-600">{hint}</p>}
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className = "", id, rows = 3, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-warmstone-800">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={[
            "bg-warmstone-100 border border-warmstone-200 rounded-sm text-warmstone-800",
            "placeholder:text-warmstone-400 px-3 py-2.5 resize-y",
            "focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400",
            "transition-colors w-full text-base",
            error ? "border-error focus:ring-red-200 focus:border-error" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        {hint && !error && <p className="text-xs text-warmstone-600">{hint}</p>}
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, className = "", id, children, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-warmstone-800">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={[
            "bg-warmstone-100 border border-warmstone-200 rounded-sm text-warmstone-800",
            "px-3 py-2.5 min-h-[44px]",
            "focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400",
            "transition-colors w-full text-base cursor-pointer",
            error ? "border-error" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        >
          {children}
        </select>
        {hint && !error && <p className="text-xs text-warmstone-600">{hint}</p>}
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
