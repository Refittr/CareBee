"use client";

import { useState, useEffect } from "react";
import { Bug, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export default function ReportBugPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [pageContext, setPageContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.full_name) setName(data.full_name);
          if (user.email) setEmail(user.email);
        });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const messageParts = [
      `BUG REPORT`,
      ``,
      `What went wrong:`,
      description,
    ];
    if (steps.trim()) {
      messageParts.push(``, `Steps to reproduce:`, steps);
    }
    if (pageContext.trim()) {
      messageParts.push(``, `Page / section:`, pageContext);
    }

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message: messageParts.join("\n") }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
    } else {
      setSent(true);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-warmstone-100">
          <Bug size={20} className="text-warmstone-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-warmstone-900">Report a bug</h1>
          <p className="text-sm text-warmstone-500">We look into every report. Thanks for helping improve CareBee.</p>
        </div>
      </div>

      <div className="bg-warmstone-white border border-warmstone-100 rounded-xl shadow-sm p-6">
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle size={40} className="text-sage-400" />
            <h2 className="text-lg font-bold text-warmstone-900">Report sent</h2>
            <p className="text-sm text-warmstone-600">
              Thanks for letting us know. We will look into it and may follow up at <strong>{email}</strong>.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4">
                <Alert type="error" description={error} />
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Your name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Textarea
                label="What went wrong?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened and what you expected to happen."
                rows={4}
                required
              />
              <Textarea
                label="Steps to reproduce (optional)"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="1. Go to...\n2. Click...\n3. See error"
                rows={3}
              />
              <Input
                label="Page or section (optional)"
                type="text"
                value={pageContext}
                onChange={(e) => setPageContext(e.target.value)}
                placeholder="e.g. Person overview, Appointments, Scan document"
              />
              <Button type="submit" loading={loading} fullWidth className="mt-1">
                Send report
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
