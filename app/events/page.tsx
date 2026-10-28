import Link from "next/link";
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

  // 仮説2：ログインしていなくても交流会の中身を見られるようにする(開催予定・受付終了のみ)。
  // 参加登録のボタンを押した時点でアカウント作成に進む。
  const [{ data }, { data: myRegs }] = await Promise.all([
    user
      ? supabase.from("events").select("*").order("event_date", { ascending: false })
      : supabase
          .from("events")
          .select("*")
          .in("status", ["upcoming", "closed"])
          .order("event_date", { ascending: true }),
    user
      ? supabase
          .from("registrations")
          .select("event_id, attending")
          .eq("participant_id", user.id)
      : Promise.resolve({ data: [] as { event_id: string; attending: boolean }[] }),
  ]);

  const events = (data as EventRow[]) || [];
  const registeredEventIds = new Set(
    (myRegs || []).filter((r) => r.attending).map((r) => r.event_id)
  );

  const grouped = new Map<string, EventRow[]>();
  for (const ev of events) {
    const key = formatMonthLabel(ev.event_date);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ev);
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">交流会一覧</h1>
      {!user && (
        <div className="card mb-6 bg-primary-light text-sm text-gray-700">
          アーク起業アカデミーの交流会です。気になる回を開くと、内容を見てから参加登録できます。
          <Link href="/login" className="ml-1 font-semibold text-primary underline">
            ログインはこちら
          </Link>
        </div>
      )}
      {events.length === 0 ? (
        <p className="text-sm text-gray-500">まだ交流会が登録されていません。</p>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([month, list]) => (
            <div key={month}>
              <h2 className="mb-3 px-1 text-sm font-bold text-gray-400">
                {month}
              </h2>
              <div className="space-y-3">
                {list.map((ev) => {
                  const d = new Date(ev.event_date + "T00:00:00");
                  return (
                    <Link
                      key={ev.id}
                      href={`/events/${ev.id}`}
                      className="card-tap flex items-stretch gap-4 overflow-hidden rounded-[20px] border border-gray-100 bg-white p-0 shadow-[0_2px_10px_rgba(16,25,47,0.06)] active:shadow-none"
                    >
                      <div className="flex w-16 shrink-0 flex-col items-center justify-center bg-primary-light py-4 text-primary">
                        <span className="text-[11px] font-bold">
                          {d.toLocaleDateString("ja-JP", { month: "short" })}
                        </span>
                        <span className="font-display text-2xl font-bold leading-none">
                          {d.getDate()}
                        </span>
                        <span className="text-[10px] text-primary/60">
                          {d.toLocaleDateString("ja-JP", { weekday: "short" })}
                        </span>
                      </div>
                      <div className="flex flex-1 items-center justify-between gap-3 py-4 pr-4">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">
                            {formatEventDate(ev.event_date)}
                            {ev.start_time ? ` ${ev.start_time.slice(0, 5)}〜` : ""}
                          </p>
                          <p className="mt-1 truncate font-semibold">{ev.title}</p>
                          {ev.venue && (
                            <p className="mt-1 truncate text-sm text-gray-500">
                              {ev.venue}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className={`badge ${STATUS_COLOR[ev.status]}`}>
                            {STATUS_LABEL[ev.status]}
                          </span>
                          {registeredEventIds.has(ev.id) && (
                            <span className="badge bg-primary-light text-primary">
                              参加登録済み
                            </span>
                          )}
                          {ev.status === "upcoming" &&
                            !registeredEventIds.has(ev.id) && (
                              <span className="text-xs font-bold text-accent-dark">
                                申し込む &gt;
                              </span>
                            )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
