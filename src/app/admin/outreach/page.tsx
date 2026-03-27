import { createServiceClient } from "@/lib/supabase/server";
import { Mail, UserX, Home, CheckCircle, Copy } from "lucide-react";
import type { Metadata } from "next";
import { CopyEmailsButton } from "./CopyEmailsButton";

export const metadata: Metadata = { title: "Outreach | CareBee Admin" };
export const dynamic = "force-dynamic";

function SectionHeading({ title, count, icon: Icon, color }: { title: string; count: number; icon: React.ElementType; color: string }) {
  return (
    <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-warmstone-100`}>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={15} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-warmstone-900">{title}</h2>
        <p className="text-xs text-warmstone-500">{count} {count === 1 ? "person" : "people"}</p>
      </div>
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function UserTable({ rows }: { rows: { name: string; email: string; date: string | null; dateLabel: string }[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-warmstone-400 py-4 text-center">None right now.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-warmstone-100">
          <th className="text-left py-2 pr-4 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Name</th>
          <th className="text-left py-2 pr-4 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Email</th>
          <th className="text-right py-2 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">{rows[0]?.dateLabel}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-warmstone-50">
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="py-2.5 pr-4 font-medium text-warmstone-800 truncate max-w-[160px]">{r.name || "-"}</td>
            <td className="py-2.5 pr-4 text-warmstone-500 text-xs">{r.email}</td>
            <td className="py-2.5 text-right text-warmstone-400 text-xs whitespace-nowrap">{formatDate(r.date)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function OutreachPage() {
  const svc = await createServiceClient();

  // Fetch auth users (includes email_confirmed_at)
  const { data: { users: authUsers } } = await svc.auth.admin.listUsers({ perPage: 1000 });

  // Fetch profiles and household ownerships in parallel
  const [
    { data: profiles },
    { data: ownerMemberships },
  ] = await Promise.all([
    svc.from("profiles").select("id, full_name, email, account_type, created_at"),
    svc.from("household_members").select("user_id").eq("role", "owner"),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const ownersSet = new Set((ownerMemberships ?? []).map((m) => m.user_id));

  // Auth user map: id -> { email_confirmed_at, last_sign_in_at }
  const authMap = new Map(authUsers.map((u) => [u.id, u]));

  // ---- Segment 1: Signed up but not verified ----
  const unverified = authUsers
    .filter((u) => !u.email_confirmed_at)
    .map((u) => {
      const profile = profileMap.get(u.id);
      return {
        name: profile?.full_name ?? u.email ?? "",
        email: u.email ?? "",
        date: u.created_at ?? null,
        dateLabel: "Signed up",
      };
    })
    .sort((a, b) => (a.date ?? "") > (b.date ?? "") ? -1 : 1);

  // ---- Segment 2: Verified, logged in, but no household ----
  const verifiedNoHousehold = (profiles ?? [])
    .filter((p) => {
      if (p.account_type === "admin" || p.account_type === "tester") return false;
      if (ownersSet.has(p.id)) return false;
      const auth = authMap.get(p.id);
      return auth?.email_confirmed_at != null;
    })
    .map((p) => {
      const auth = authMap.get(p.id);
      return {
        name: p.full_name ?? "",
        email: p.email ?? "",
        date: auth?.last_sign_in_at ?? p.created_at ?? null,
        dateLabel: "Last login",
      };
    })
    .sort((a, b) => (a.date ?? "") > (b.date ?? "") ? -1 : 1);

  // ---- Segment 3: Has a household ----
  const withHousehold = (profiles ?? [])
    .filter((p) => {
      if (p.account_type === "admin") return false;
      return ownersSet.has(p.id);
    })
    .map((p) => {
      const auth = authMap.get(p.id);
      return {
        name: p.full_name ?? "",
        email: p.email ?? "",
        date: auth?.last_sign_in_at ?? p.created_at ?? null,
        dateLabel: "Last login",
      };
    })
    .sort((a, b) => (a.date ?? "") > (b.date ?? "") ? -1 : 1);

  const unverifiedEmails = unverified.map((u) => u.email).filter(Boolean);
  const noHouseholdEmails = verifiedNoHousehold.map((u) => u.email).filter(Boolean);
  const householdEmails = withHousehold.map((u) => u.email).filter(Boolean);

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-warmstone-900">Outreach</h1>
        <p className="text-sm text-warmstone-500 mt-1">Segmented user lists for targeted emails.</p>
      </div>

      <div className="flex flex-col gap-6">

        {/* Segment 1: Unverified */}
        <div className="bg-white border border-warmstone-100 rounded-xl p-6">
          <SectionHeading
            title="Signed up, email not verified"
            count={unverified.length}
            icon={UserX}
            color="bg-red-50 text-red-500"
          />
          <p className="text-xs text-warmstone-500 mb-4">
            These people created an account but have not clicked the verification link. They cannot log in. A reminder email may help.
          </p>
          {unverifiedEmails.length > 0 && (
            <div className="mb-4">
              <CopyEmailsButton emails={unverifiedEmails} label="Copy email list" />
            </div>
          )}
          <UserTable rows={unverified} />
        </div>

        {/* Segment 2: Verified, no household */}
        <div className="bg-white border border-warmstone-100 rounded-xl p-6">
          <SectionHeading
            title="Verified, no care record yet"
            count={verifiedNoHousehold.length}
            icon={Home}
            color="bg-amber-50 text-amber-500"
          />
          <p className="text-xs text-warmstone-500 mb-4">
            These people have verified their email and can log in, but have not created a care record. Their 30-day trial starts when they do. A nudge email with clear next steps could convert these.
          </p>
          {noHouseholdEmails.length > 0 && (
            <div className="mb-4">
              <CopyEmailsButton emails={noHouseholdEmails} label="Copy email list" />
            </div>
          )}
          <UserTable rows={verifiedNoHousehold} />
        </div>

        {/* Segment 3: Has household */}
        <div className="bg-white border border-warmstone-100 rounded-xl p-6">
          <SectionHeading
            title="Created a care record"
            count={withHousehold.length}
            icon={CheckCircle}
            color="bg-sage-50 text-sage-600"
          />
          <p className="text-xs text-warmstone-500 mb-4">
            These people have set up a care record and are in their 30-day trial. Good candidates for onboarding tips or feature highlight emails.
          </p>
          {householdEmails.length > 0 && (
            <div className="mb-4">
              <CopyEmailsButton emails={householdEmails} label="Copy email list" />
            </div>
          )}
          <UserTable rows={withHousehold} />
        </div>

      </div>
    </div>
  );
}
