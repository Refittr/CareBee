"use client";

import { Sparkles, Brain, Pill, Clock, FileSearch, PoundSterling } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const FEATURES = [
  { icon: <Brain size={16} />, label: "Health insights & NICE guideline checks" },
  { icon: <Pill size={16} />, label: "Drug interaction detection" },
  { icon: <FileSearch size={16} />, label: "Document scanning & data extraction" },
  { icon: <Clock size={16} />, label: "NHS waiting list time estimates" },
  { icon: <PoundSterling size={16} />, label: "Benefits & entitlements eligibility check" },
  { icon: <Sparkles size={16} />, label: "Appointment prep briefs & post-visit summaries" },
];

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Unlock AI features" maxWidth="sm">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-honey-50 mx-auto">
          <Sparkles size={24} className="text-honey-600" />
        </div>

        <div className="text-center">
          <p className="text-sm text-warmstone-600 leading-relaxed">
            CareBee&apos;s AI features help you stay on top of complex care — spotting risks, flagging gaps, and saving hours of research.
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

        <div className="rounded-xl bg-honey-50 border border-honey-200 px-4 py-3 text-center">
          <p className="text-lg font-bold text-warmstone-900">£4.99 <span className="text-sm font-normal text-warmstone-500">/ month</span></p>
          <p className="text-xs text-warmstone-500 mt-0.5">Cancel any time. No hidden fees.</p>
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={() => {
            // Stripe checkout will be wired here
            onClose();
          }}
        >
          Upgrade to CareBee Plus
        </Button>

        <p className="text-xs text-warmstone-400 text-center leading-relaxed">
          We keep AI costs honest - your subscription goes directly towards the compute that powers these checks. We don&apos;t believe in charging for things you can do yourself; AI is where it genuinely saves you time.
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
