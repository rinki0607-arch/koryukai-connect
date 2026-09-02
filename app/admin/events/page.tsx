import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/constants";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  upcoming: "開催予定",
  closed: "受付終了",
  past: "開催済み",
  canceled: "中止",
};

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: false });

  const events = (data as EventRow[]) || [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">交流会管理</h1>
        <Link href="/admin/events/new" className="btn-primary">
          新規作成
        </Link>
      </div>
      <div className="space-y-3">
        {events.map((ev) => (
          <Link
            key={ev.id}
            href={`/admin/events/${ev.id}`}
            className="card flex items-center justify-between hover:border-primary"
          >
            <div>
              <p className="text-xs text-gray-500">
                {formatEventDate(ev.event_date)}
              </p>
              <p className="font-semibold">{ev.title}</p>
            </div>
            <span className="badge bg-gray-100 text-gray-600">
              {STATUS_LABEL[ev.status]}
            </span>
          </Link>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-gray-500">まだ交流会がありません。</p>
        )}
      </div>
    </div>
  );
}
