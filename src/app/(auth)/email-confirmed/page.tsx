import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function EmailConfirmedPage() {
  return (
    <div className="min-h-screen bg-warmstone-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <Logo size="lg" />
          </div>
        </div>

        <div className="bg-warmstone-white border border-warmstone-100 rounded-xl shadow-sm p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-sage-100 flex items-center justify-center">
            <CheckCircle size={28} className="text-sage-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-warmstone-900 mb-1">Email confirmed</h1>
            <p className="text-sm text-warmstone-600">Your account is ready. Sign in to get started.</p>
          </div>
          <Link
            href="/login"
            className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-honey-400 hover:bg-honey-500 text-warmstone-white font-semibold text-sm transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
