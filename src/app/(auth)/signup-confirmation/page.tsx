"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, AlertCircle, ChevronLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="bg-warmstone-white border border-warmstone-100 rounded-xl shadow-sm p-8">
      <div className="flex justify-center mb-4">
        <Mail size={48} className="text-honey-500" />
      </div>

      <h1 className="text-xl font-bold text-warmstone-900 text-center mb-4">Check your email</h1>

      <p className="text-warmstone-700 text-sm mb-4 text-center">
        We've sent a confirmation link to <span className="font-semibold">{email || "your email"}</span>
      </p>

      <div className="bg-sage-50 border border-sage-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle size={20} className="text-sage-600 shrink-0 mt-0.5" />
          <div className="text-sm text-sage-800">
            <p className="font-semibold mb-1">Don't see it?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your junk or spam folder</li>
              <li>The link expires after 24 hours</li>
            </ul>
          </div>
        </div>
      </div>

      <p className="text-sm text-warmstone-600 text-center">
        Click the link in the email to confirm your account and get started.
      </p>
    </div>
  );
}

export default function SignupConfirmationPage() {
  return (
    <div className="min-h-screen bg-warmstone-50 flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="absolute top-4 left-4 flex items-center gap-1 text-sm text-warmstone-500 hover:text-warmstone-900 transition-colors">
        <ChevronLeft size={16} />
        Back to home
      </Link>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-warmstone-600 text-sm mt-1">Confirm your email</p>
        </div>

        <Suspense fallback={
          <div className="bg-warmstone-white border border-warmstone-100 rounded-xl shadow-sm p-8 text-center text-warmstone-400 text-sm">
            Loading...
          </div>
        }>
          <ConfirmationContent />
        </Suspense>

        <p className="text-center text-sm text-warmstone-600 mt-6">
          Already confirmed?{" "}
          <Link href="/login" className="text-honey-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
