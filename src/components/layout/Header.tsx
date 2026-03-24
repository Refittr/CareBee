"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  actions?: React.ReactNode;
}

export function Header({ title, showBack, backHref, actions }: HeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  }

  return (
    <header className="md:hidden sticky top-0 z-30 bg-warmstone-white border-b border-warmstone-100 px-4 py-3 flex items-center gap-3 min-h-[56px]">
      {showBack && (
        <button
          onClick={handleBack}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] -ml-1 rounded-lg border border-warmstone-200 bg-warmstone-white text-warmstone-700 hover:bg-warmstone-50 hover:border-warmstone-300 hover:text-warmstone-900 active:bg-warmstone-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      {!showBack && (
        <Link href="/dashboard" className="flex items-center gap-1.5">
          <Logo size="sm" />
        </Link>
      )}
      {title && (
        <h1 className="flex-1 text-base font-bold text-warmstone-900 truncate">{title}</h1>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  );
}
