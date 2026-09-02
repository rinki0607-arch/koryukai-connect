import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let upcoming: EventRow[] = [];
  if (user) {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", today)
      .neq("status", "canceled")
      .order("event_date", { ascending: true })
      .limit(3);
    upcoming = (data as EventRow[]) || [];
  }

  return (
    <div className="space-y-10">
      <section className="card bg-gradient-to-br from-primary-light to-white">
        <h1 className="text-2xl font-bold">交流会コネクト</h1>
        <p className="mt-2 text-gray-600">
          交流会の参加登録・二次会希望の確認、参加者の業種や繋がりたい人の情報の蓄積、
          交流会後のマッチングまでを1つのアプリで完結できます。
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/events" className="btn-primary">
            交流会一覧を見る
          </Link>
          {!user && (
            <Link href="/login" className="btn-secondary">
              ログイン / 新規登録
            </Link>
          )}
        </div>
      </section>

      {user && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">直近の交流会</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">
              現在公開されている今後の交流会はありません。
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {upcoming.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="card block hover:border-primary"
                >
                  <p className="text-xs text-gray-500">
                    {formatEventDate(ev.event_date)}
                  </p>
                  <p className="mt-1 font-semibold">{ev.title}</p>
                  {ev.venue && (
                    <p className="mt-1 text-sm text-gray-500">{ev.venue}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
