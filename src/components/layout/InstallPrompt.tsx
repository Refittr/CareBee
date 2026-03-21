"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const VISIT_KEY = "carebee_visit_count";
const DISMISS_KEY = "carebee_install_dismissed_until";
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (visits >= 2) setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    setShow(false);
  }

  function handleDismiss() {
    localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000)
    );
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="md:hidden fixed bottom-16 left-0 right-0 z-50 px-4 pb-2">
      <div className="bg-warmstone-white border border-warmstone-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
        <p className="flex-1 text-sm text-warmstone-800">
          Add CareBee to your home screen for quick access
        </p>
        <Button size="sm" onClick={handleInstall}>
          Install
        </Button>
        <button
          onClick={handleDismiss}
          className="text-warmstone-400 hover:text-warmstone-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
