"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BeeIcon } from "@/components/ui/BeeIcon";
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
          className="text-warmstone-600 hover:text-warmstone-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      {!showBack && (
        <Link href="/dashboard" className="flex items-center gap-1.5">
          <BeeIcon size={20} className="text-honey-400" />
        </Link>
      )}
      {title && (
        <h1 className="flex-1 text-base font-bold text-warmstone-900 truncate">{title}</h1>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  );
}
