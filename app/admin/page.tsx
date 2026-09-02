import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  const [{ count: totalParticipants }, { count: upcomingCount }, { data: nextEvents }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("event_date", today)
        .neq("status", "canceled"),
      supabase
        .from("events")
        .select("*")
        .gte("event_date", today)
        .neq("status", "canceled")
        .order("event_date", { ascending: true })
        .limit(5),
    ]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <p className="text-sm text-gray-500">登録ユーザー数</p>
          <p className="mt-1 text-3xl font-bold">{totalParticipants ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">今後の交流会数</p>
          <p className="mt-1 text-3xl font-bold">{upcomingCount ?? 0}</p>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">直近の交流会</h2>
          <Link href="/admin/events/new" className="btn-primary">
            交流会を新規作成
          </Link>
        </div>
        <div className="space-y-3">
          {((nextEvents as EventRow[]) || []).map((ev) => (
            <Link
              key={ev.id}
              href={`/admin/events/${ev.id}`}
              className="card block hover:border-primary"
            >
              <p className="text-xs text-gray-500">
                {formatEventDate(ev.event_date)}
              </p>
              <p className="font-semibold">{ev.title}</p>
            </Link>
          ))}
          {(!nextEvents || nextEvents.length === 0) && (
            <p className="text-sm text-gray-500">今後の交流会はありません。</p>
          )}
        </div>
      </div>
    </div>
  );
}
