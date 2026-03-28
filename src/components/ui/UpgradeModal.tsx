"use client";

import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import Link from "next/link";
import { useUserType } from "@/lib/context/UserTypeContext";
import { getAvailableTiers, isCareBeeIntroActive } from "@/lib/stripe-config";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  householdId: string;
}

export function UpgradeModal({ open, onClose, householdId }: UpgradeModalProps) {
  const { userType } = useUserType();
  const tiers = getAvailableTiers(userType);
  const introActive = isCareBeeIntroActive();

  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [selectedTierIndex, setSelectedTierIndex] = useState(tiers.length - 1); // default: highest tier
  const [loading, setLoading] = useState(false);

  const selectedTier = tiers[selectedTierIndex] ?? tiers[0];
  const amount = billing === "monthly" ? selectedTier.monthlyAmount : selectedTier.annualAmount;
  const period = billing === "monthly" ? "month" : "year";

  // Show "Save X%" badge on annual toggle
  const annualSaving = selectedTier
    ? Math.round((1 - selectedTier.annualAmount / (selectedTier.monthlyAmount * 12)) * 100)
    : 0;

  const priceId = billing === "monthly" ? selectedTier.monthlyPriceId : selectedTier.annualPriceId;

  async function startCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, householdId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
        alert(data.error ?? "Could not start checkout. Please try again.");
      }
    } catch {
      setLoading(false);
      alert("Could not start checkout. Please try again.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Unlock AI features" maxWidth="sm">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-honey-50 mx-auto">
          <Sparkles size={24} className="text-honey-600" />
        </div>

        {/* Billing period toggle */}
        <div className="flex rounded-full bg-warmstone-100 p-1 gap-1 self-center">
          <button
            onClick={() => setBilling("monthly")}
            className={[
              "px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
              billing === "monthly"
                ? "bg-warmstone-white text-warmstone-900 shadow-sm"
                : "text-warmstone-500",
            ].join(" ")}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={[
              "px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5",
              billing === "annual"
                ? "bg-warmstone-white text-warmstone-900 shadow-sm"
                : "text-warmstone-500",
            ].join(" ")}
          >
            Annual
            {annualSaving > 0 && (
              <span className="text-[10px] font-bold bg-honey-100 text-honey-700 px-1.5 py-0.5 rounded-full">
                Save {annualSaving}%
              </span>
            )}
          </button>
        </div>

        {/* Tier selector (only shown when there are multiple tiers) */}
        {tiers.length > 1 && (
          <div className="grid grid-cols-2 gap-2">
            {tiers.map((tier, i) => {
              const amt = billing === "monthly" ? tier.monthlyAmount : tier.annualAmount;
              const selected = selectedTierIndex === i;
              return (
                <button
                  key={tier.plan}
                  onClick={() => setSelectedTierIndex(i)}
                  className={[
                    "rounded-xl border p-3 text-left transition-all",
                    selected
                      ? "border-honey-400 bg-honey-50 ring-1 ring-honey-300"
                      : "border-warmstone-200 hover:border-warmstone-300",
                  ].join(" ")}
                >
                  <p className="text-xs font-bold text-warmstone-900 leading-tight">{tier.name}</p>
                  <p className="text-lg font-bold text-honey-600 mt-1">
                    £{amt}
                    <span className="text-xs font-normal text-warmstone-500">/{period}</span>
                  </p>
                  {tier.recommended && (
                    <span className="text-[10px] font-bold text-honey-700 uppercase tracking-wide">
                      Recommended
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Features list */}
        <ul className="flex flex-col gap-2">
          {selectedTier.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-warmstone-800">
              <Check size={14} className="text-honey-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>

        {/* Early adopter note for carers */}
        {userType !== "self_care" && introActive && (
          <p className="text-xs text-honey-700 bg-honey-50 border border-honey-100 rounded-lg px-3 py-2 text-center">
            Early adopter rate. Lock in this price for as long as you subscribe before 1 July 2026.
          </p>
        )}

        {/* CTA */}
        <Button
          variant="primary"
          className="w-full"
          loading={loading}
          onClick={startCheckout}
        >
          Subscribe to {selectedTier.name}, £{amount}/{period}
        </Button>

        <p className="text-xs text-warmstone-400 text-center leading-relaxed">
          Your subscription goes directly towards the AI compute that powers these checks. Cancel any time.
        </p>

        {/* Cross-type nudge */}
        {userType === "self_care" ? (
          <p className="text-xs text-warmstone-400 text-center">
            Looking after someone else?{" "}
            <Link href="/settings" onClick={onClose} className="text-honey-600 hover:underline font-semibold">
              See CareBee Plus
            </Link>
          </p>
        ) : (
          <p className="text-xs text-warmstone-400 text-center">
            Just managing your own health?{" "}
            <Link href="/settings" onClick={onClose} className="text-honey-600 hover:underline font-semibold">
              See Self-Care plans
            </Link>
          </p>
        )}

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
