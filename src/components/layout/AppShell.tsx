"use client";

import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { InstallPrompt } from "./InstallPrompt";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { createContext, useContext } from "react";
import type { ToastType } from "@/hooks/useToast";

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useAppToast() {
  return useContext(ToastContext);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { toasts, addToast, removeToast } = useToast();

  return (
    <ToastContext.Provider value={{ addToast }}>
      <div className="flex min-h-screen bg-warmstone-50">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <MobileNav />
      <InstallPrompt />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}
