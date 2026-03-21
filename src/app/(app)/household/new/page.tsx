"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAppToast } from "@/components/layout/AppShell";

export default function NewHouseholdPage() {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useAppToast();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);
    setError(null);
    if (!name.trim()) {
      setNameError("Please enter a name for the household.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.rpc("create_household_with_owner", {
      household_name: name.trim(),
    });
    if (err || !data) {
      setError(err?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    } else {
      addToast("Household created.", "success");
      router.push(`/household/${data}`);
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-lg">
      <Header title="New household" showBack backHref="/dashboard" />
      <Breadcrumbs
        items={[
          { label: "Your households", href: "/dashboard" },
          { label: "New household" },
        ]}
      />
      <h1 className="text-2xl font-bold text-warmstone-900 mb-6 hidden md:block">
        Create a household
      </h1>
      {error && (
        <div className="mb-4">
          <Alert type="error" description={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input
          label="Household name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mum's Care, Davies Family"
          required
          error={nameError ?? undefined}
          hint="This is just a name to help you find it. You can change it later."
          autoFocus
        />
        <Button type="submit" loading={loading} fullWidth>
          Create household
        </Button>
      </form>
    </div>
  );
}
