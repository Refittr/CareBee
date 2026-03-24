import { createServiceClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Messages | Admin | CareBee" };

export default async function AdminMessagesPage() {
  const svc = await createServiceClient();

  const { data: messages } = await svc
    .from("contact_messages")
    .select("id, name, email, message, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold text-warmstone-900 mb-1">Contact Messages</h1>
      <p className="text-sm text-warmstone-500 mb-6">{messages?.length ?? 0} message{messages?.length !== 1 ? "s" : ""}</p>

      {!messages?.length ? (
        <div className="bg-white rounded-xl border border-warmstone-200 px-6 py-12 text-center">
          <p className="text-warmstone-500 text-sm">No messages yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-white rounded-xl border border-warmstone-200 p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-semibold text-warmstone-900">{msg.name}</p>
                  <a href={`mailto:${msg.email}`} className="text-sm text-honey-600 hover:underline">{msg.email}</a>
                </div>
                <p className="text-xs text-warmstone-400 shrink-0">
                  {new Date(msg.created_at).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <p className="text-sm text-warmstone-700 whitespace-pre-line">{msg.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
