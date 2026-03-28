"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, HeartHandshake } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import type { UserType } from "@/lib/types/database";

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingFork />
    </Suspense>
  );
}

function OnboardingFork() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as UserType | null;

  const [selected, setSelected] = useState<UserType | null>(typeParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      // Explicit typeParam in URL means the user deliberately chose a type
      // (e.g. logged-in user clicking a homepage CTA). Handle it before any
      // early-exit so they don't get bounced back to their old setup.
      if (typeParam === "self_care" || typeParam === "carer") {
        handleChoice(typeParam);
        return;
      }

      const { data: memberships } = await supabase
        .from("household_members")
        .select("id")
        .eq("user_id", user.id)
        .not("accepted_at", "is", null)
        .limit(1);

      if (memberships && memberships.length > 0) {
        router.replace("/dashboard");
        return;
      }

      // Type already known from signup — skip the choice screen entirely
      const storedType = localStorage.getItem("carebee_signup_type");
      if (storedType === "self_care" || storedType === "carer") {
        localStorage.removeItem("carebee_signup_type");
        handleChoice(storedType);
      }
    }
    check();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleChoice(choice: UserType) {
    setSelected(choice);
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const selfCareTrial = choice === "self_care"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Save user_type to profile — upsert so a missing profile row is created
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email ?? "",
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          "",
        account_type: "standard" as const,
        plan: choice === "self_care" ? "self_care_plus" as const : "free" as const,
        ai_uses_count: 0,
        is_subscribed: false,
        user_type: choice,
        ...(selfCareTrial ? { trial_ends_at: selfCareTrial } : {}),
      }, { onConflict: "id" });

    if (profileErr) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    if (choice === "carer") {
      router.push("/household/new");
      return;
    }

    // self_care: if the user already owns a household (e.g. they were a carer
    // and are switching type), skip creation and go straight to dashboard.
    const { data: existingOwned } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .not("accepted_at", "is", null)
      .limit(1);

    if (existingOwned && existingOwned.length > 0) {
      router.push("/dashboard");
      return;
    }

    // self_care: auto-create household + person
    // Refresh session so auth.uid() is valid inside the RPC
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0]
      ?? (user.user_metadata?.name as string | undefined)?.split(" ")[0]
      ?? "My";

    const { data: householdId, error: householdErr } = await supabase.rpc(
      "create_household_with_owner",
      { household_name: `${firstName}'s Health Record` }
    );

    if (householdErr || !householdId) {
      setError(householdErr?.message ?? "Something went wrong setting up your account. Please try again.");
      setLoading(false);
      return;
    }

    // Set trial on the newly created household
    if (selfCareTrial) {
      await supabase.from("households").update({
        subscription_status: "trial",
        trial_ends_at: selfCareTrial,
      }).eq("id", householdId as string);
    }

    // Create person record using user's own name
    const fullName = (user.user_metadata?.full_name as string | undefined)
      ?? (user.user_metadata?.name as string | undefined)
      ?? "";
    const nameParts = fullName.trim().split(" ");
    const personFirstName = nameParts[0] ?? "Me";
    const personLastName = nameParts.slice(1).join(" ") || null;

    await supabase.from("people").insert({
      household_id: householdId,
      first_name: personFirstName,
      last_name: personLastName ?? "",
      hospital_numbers: [],
      dnacpr_status: false,
    });

    router.push("/dashboard");
  }

  const cards: { type: UserType; icon: React.ReactNode; title: string; subtitle: string }[] = [
    {
      type: "self_care",
      icon: <User size={32} className="text-honey-400" />,
      title: "I am managing my own health",
      subtitle:
        "Keep track of your conditions, medications, appointments and documents in one place.",
    },
    {
      type: "carer",
      icon: <HeartHandshake size={32} className="text-sage-400" />,
      title: "I am looking after someone else",
      subtitle:
        "Manage health records for family members or people you care for, and share with your care team.",
    },
  ];

  return (
    <div className="min-h-screen bg-warmstone-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center mb-8">
          <Logo size="lg" />
        </div>

        <h1 className="font-display text-3xl md:text-4xl text-warmstone-900 text-center mb-3">
          What brings you to CareBee?
        </h1>
        <p className="text-warmstone-500 text-center mb-10">
          This helps us set up your account the right way. You can change it later.
        </p>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cards.map((card) => {
            const isSelected = selected === card.type;
            return (
              <button
                key={card.type}
                type="button"
                disabled={loading}
                onClick={() => handleChoice(card.type)}
                className={`text-left rounded-xl border-2 p-6 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-honey-400 disabled:opacity-60 disabled:cursor-not-allowed ${
                  isSelected
                    ? "border-honey-400 bg-honey-50 shadow-md"
                    : "border-warmstone-200 bg-warmstone-white hover:border-honey-300 hover:shadow-sm"
                }`}
              >
                <div className="mb-4">{card.icon}</div>
                <h2 className="font-bold text-warmstone-900 text-lg mb-2 leading-snug">
                  {card.title}
                </h2>
                <p className="text-warmstone-600 text-sm leading-relaxed">{card.subtitle}</p>
                {loading && isSelected && (
                  <p className="text-xs text-honey-600 font-semibold mt-3">Setting up your account...</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
