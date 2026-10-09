import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/constants";
import InstallButton from "@/components/InstallButton";

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
      <section className="relative overflow-hidden rounded-[24px] bg-primary px-6 py-8 text-white shadow-[0_8px_28px_rgba(16,25,47,0.28)]">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
        <p className="relative font-mono text-[11px] font-bold tracking-[0.25em] text-accent">
          ARC ENTREPRENEUR NETWORK
        </p>
        <h1
          className="relative mt-1 text-3xl font-bold"
          style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.05em" }}
        >
          ARKIVE
        </h1>
        <p className="relative mt-1 text-sm text-white/60">アーク起業塾 交流会プラットフォーム</p>
        <p className="relative mt-3 text-[15px] leading-relaxed text-white/80">
          交流会の参加登録・二次会希望の確認、参加者の業種や繋がりたい人の情報の蓄積、
          交流会後のマッチング、当日のQR受付までを1つのアプリで完結できます。
        </p>

        {user ? (
          <div className="relative mt-5 flex flex-wrap gap-3">
            <Link href="/events" className="btn-primary">
              交流会一覧を見る
            </Link>
            <InstallButton className="btn min-h-[46px] border-[1.5px] border-white/30 bg-white/10 text-white hover:bg-white/20" />
          </div>
        ) : (
          <>
            <div className="relative mt-5 flex flex-wrap gap-3">
              <Link href="/login?mode=signup" className="btn-primary">
                新規登録してはじめる
              </Link>
              <InstallButton className="btn min-h-[46px] border-[1.5px] border-white/30 bg-white/10 text-white hover:bg-white/20" />
            </div>
            <p className="relative mt-4 text-sm text-white/70">
              すでにアカウントをお持ちの方は{" "}
              <Link href="/login" className="font-semibold text-accent underline underline-offset-2">
                ログイン
              </Link>
            </p>
          </>
        )}
      </section>

      {user && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">直近の交流会</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">現在公開されている今後の交流会はありません。</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {upcoming.map((ev) => (
                <Link key={ev.id} href={`/events/${ev.id}`} className="card-tap card block">
                  <p className="text-xs font-semibold text-accent-dark">{formatEventDate(ev.event_date)}</p>
                  <p className="mt-1 font-semibold">{ev.title}</p>
                  {ev.venue && <p className="mt-1 text-sm text-gray-500">{ev.venue}</p>}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
