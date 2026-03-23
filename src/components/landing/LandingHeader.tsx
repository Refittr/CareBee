"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-warmstone-white/95 backdrop-blur-md shadow-sm"
          : "bg-warmstone-white/80 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" aria-label="CareBee home">
          <Logo size="md" />
        </Link>
        <Link
          href="/signup"
          className="bg-honey-400 text-warmstone-white font-bold text-sm rounded-md px-4 py-2 hover:bg-honey-600 transition-colors shadow-[0_2px_8px_rgba(232,168,23,0.25)] min-h-[44px] flex items-center"
        >
          Get started free
        </Link>
      </div>
    </header>
  );
}
