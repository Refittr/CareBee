"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";

export function ReportIssueButton({
  defaultName = "",
  defaultEmail = "",
  source = "",
}: {
  defaultName?: string;
  defaultEmail?: string;
  source?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setSuccess(false);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fullMessage = source
      ? `[Reported from: ${source}]\n\n${message}`
      : message;

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message: fullMessage }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
    } else {
      setSuccess(true);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-xs text-warmstone-400 hover:text-warmstone-600 transition-colors underline underline-offset-2"
      >
        Report an issue
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-warmstone-white rounded-xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-honey-500" />
                <p className="font-bold text-warmstone-900 text-sm">Report an issue</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-warmstone-100 transition-colors"
              >
                <X size={16} className="text-warmstone-400" />
              </button>
            </div>

            {success ? (
              <div className="py-4 text-center">
                <p className="text-sm font-semibold text-warmstone-900 mb-1">Message sent</p>
                <p className="text-xs text-warmstone-500">Thanks for letting us know. We&apos;ll look into it.</p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-4 px-4 py-2 text-sm font-bold bg-honey-400 text-warmstone-white rounded-md hover:bg-honey-600 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {error && <p className="text-xs text-error">{error}</p>}
                <div>
                  <label className="block text-xs font-semibold text-warmstone-700 mb-1">Your name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    required
                    className="w-full px-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-900 placeholder:text-warmstone-400 focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-warmstone-700 mb-1">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-900 placeholder:text-warmstone-400 focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-warmstone-700 mb-1">What&apos;s the issue?</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe the problem you're experiencing…"
                    required
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-900 placeholder:text-warmstone-400 focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400 resize-none"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-warmstone-600 hover:text-warmstone-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-bold bg-honey-400 text-warmstone-white rounded-md hover:bg-honey-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Sending…" : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
