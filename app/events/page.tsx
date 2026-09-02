import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventRow } from "@/lib/types";
import { formatEventDate, formatMonthLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  upcoming: "開催予定",
  closed: "受付終了",
  past: "開催済み",
  canceled: "中止",
};

const STATUS_COLOR: Record<string, string> = {
  upcoming: "bg-green-100 text-green-700",
  closed: "bg-yellow-100 text-yellow-700",
  past: "bg-gray-100 text-gray-600",
  canceled: "bg-red-100 text-red-700",
};

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/events");
  }

  const { data } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: false });

  const events = (data as EventRow[]) || [];

  const grouped = new Map<string, EventRow[]>();
  for (const ev of events) {
    const key = formatMonthLabel(ev.event_date);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ev);
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">交流会一覧</h1>
      {events.length === 0 ? (
        <p className="text-sm text-gray-500">まだ交流会が登録されていません。</p>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([month, list]) => (
            <div key={month}>
              <h2 className="mb-3 text-sm font-semibold text-gray-500">
                {month}
              </h2>
              <div className="space-y-3">
                {list.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="card flex items-center justify-between gap-4 hover:border-primary"
                  >
                    <div>
                      <p className="text-xs text-gray-500">
                        {formatEventDate(ev.event_date)}
                        {ev.start_time ? ` ${ev.start_time.slice(0, 5)}〜` : ""}
                      </p>
                      <p className="mt-1 font-semibold">{ev.title}</p>
                      {ev.venue && (
                        <p className="mt-1 text-sm text-gray-500">
                          {ev.venue}
                        </p>
                      )}
                    </div>
                    <span
                      className={`badge shrink-0 ${STATUS_COLOR[ev.status]}`}
                    >
                      {STATUS_LABEL[ev.status]}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
