"use client";

import { useState } from "react";
import { Sparkles, Brain, Pill, Clock, FileSearch, PoundSterling } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  householdId: string;
}

const FEATURES = [
  { icon: <Brain size={16} />, label: "Health insights & NICE guideline checks" },
  { icon: <Pill size={16} />, label: "Drug interaction detection" },
  { icon: <FileSearch size={16} />, label: "Document scanning & data extraction" },
  { icon: <Clock size={16} />, label: "NHS waiting list time estimates" },
  { icon: <PoundSterling size={16} />, label: "Benefits & entitlements eligibility check" },
  { icon: <Sparkles size={16} />, label: "Appointment prep briefs & post-visit summaries" },
];

export function UpgradeModal({ open, onClose, householdId }: UpgradeModalProps) {
  const [loading, setLoading] = useState<"monthly" | "annual" | null>(null);

  async function startCheckout(plan: "monthly" | "annual") {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, householdId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(null);
        alert(data.error ?? "Could not start checkout. Please try again.");
      }
    } catch {
      setLoading(null);
      alert("Could not start checkout. Please try again.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Unlock AI features" maxWidth="sm">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-honey-50 mx-auto">
          <Sparkles size={24} className="text-honey-600" />
        </div>

        <div className="text-center">
          <p className="text-sm text-warmstone-600 leading-relaxed">
            CareBee&apos;s AI features help you stay on top of complex care - spotting risks, flagging gaps, and saving hours of research.
          </p>
        </div>

        <ul className="flex flex-col gap-2.5">
          {FEATURES.map((f) => (
            <li key={f.label} className="flex items-center gap-3 text-sm text-warmstone-800">
              <span className="text-honey-500 shrink-0">{f.icon}</span>
              {f.label}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            className="w-full"
            loading={loading === "monthly"}
            disabled={loading !== null}
            onClick={() => startCheckout("monthly")}
          >
            Subscribe — £4.99 / month
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            loading={loading === "annual"}
            disabled={loading !== null}
            onClick={() => startCheckout("annual")}
          >
            Subscribe — £44.99 / year
            <span className="ml-1.5 text-xs font-normal text-white bg-white/20 rounded-full px-2 py-0.5">Save 25%</span>
          </Button>
        </div>

        <p className="text-xs text-warmstone-400 text-center leading-relaxed">
          We keep AI costs honest - your subscription goes directly towards the compute that powers these checks. Cancel any time.
        </p>

        <button
          onClick={onClose}
          className="text-xs text-warmstone-400 hover:text-warmstone-600 transition-colors text-center"
        >
          Maybe later
        </button>
      </div>
    </Modal>
  );
}
