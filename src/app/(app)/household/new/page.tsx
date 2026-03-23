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
import { logActivity } from "@/lib/logActivity";

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
      setNameError("Please enter a name for this care record.");
      return;
    }
    setLoading(true);
    // Ensure session is fresh before calling the RPC (auth.uid() requires a valid JWT)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Your session has expired. Please sign in again.");
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase.rpc("create_household_with_owner", {
      household_name: name.trim(),
    });
    if (err || !data) {
      setError(err?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    } else {
      await logActivity("household_created", "household", data);
      addToast("Care record created.", "success");
      router.push(`/household/${data}`);
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-lg">
      <Header title="New care record" showBack backHref="/dashboard" />
      <Breadcrumbs
        items={[
          { label: "Your care records", href: "/dashboard" },
          { label: "New care record" },
        ]}
      />
      <h1 className="text-2xl font-bold text-warmstone-900 mb-6 hidden md:block">
        Create a care record
      </h1>
      {error && (
        <div className="mb-4">
          <Alert type="error" description={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input
          label="Care record name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mum's Care, Davies Family"
          required
          error={nameError ?? undefined}
          hint="This is just a name to help you identify it. You can change it later."
          autoFocus
        />
        <Button type="submit" loading={loading} fullWidth>
          Create care record
        </Button>
      </form>
    </div>
  );
}
