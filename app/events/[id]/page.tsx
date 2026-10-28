import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventRow, Profile, RegistrationRow } from "@/lib/types";
import { formatEventDate } from "@/lib/constants";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import RegistrationForm from "@/components/RegistrationForm";
import { getRefCode, logFunnelEvent } from "@/lib/tracking";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { id } = await params;
  const { payment } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 仮説2：ログインしていない人にも交流会の中身を見せ、参加登録のボタンでアカウント作成に進める
  if (!user) {
    const { data: publicEvent } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!publicEvent) {
      redirect(`/login?next=/events/${id}`);
    }
    await logFunnelEvent(id, "public_view");
    return <PublicEventDetail ev={publicEvent as EventRow} />;
  }

  const refCode = await getRefCode();

  // 交流会情報・自分の参加登録・自分のプロフィールは互いに結果を必要としない
  // (idとuser.idだけで決まる)ので、1つずつ待たずに同時に取得する。
  const [{ data: event }, { data: registration }, { data: profile }] =
    await Promise.all([
      supabase.from("events").select("*").eq("id", id).single(),
      supabase
        .from("registrations")
        .select("*")
        .eq("event_id", id)
        .eq("participant_id", user.id)
        .maybeSingle(),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);

  if (!event) notFound();

  const ev = event as EventRow;

  return (
    <div>
      <Link
        href="/events"
        className="mb-4 inline-block text-sm text-gray-500 hover:text-primary"
      >
        ← 交流会一覧に戻る
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {payment === "success" && (
            <div className="card mb-4 border-green-200 bg-green-50 text-sm text-green-800">
              ✅ お支払いが完了しました。ご登録ありがとうございます。
            </div>
          )}
          {payment === "canceled" && (
            <div className="card mb-4 border-amber-200 bg-amber-50 text-sm text-amber-800">
              決済がキャンセルされました。引き続き参加登録フォームから決済に進めます。
            </div>
          )}
          <p className="text-sm text-gray-500">{formatEventDate(ev.event_date)}</p>
          <h1 className="mt-1 text-xl font-bold">{ev.title}</h1>
          {ev.venue && <p className="mt-2 text-gray-600">会場: {ev.venue}</p>}
          {ev.start_time && (
            <p className="mt-1 text-gray-600">
              時間: {ev.start_time.slice(0, 5)}
              {ev.end_time ? `〜${ev.end_time.slice(0, 5)}` : ""}
            </p>
          )}
          {(ev.fee_note || ev.fee_amount) && (
            <p className="mt-1 text-gray-600">
              参加費:{" "}
              {ev.fee_amount ? `${ev.fee_amount.toLocaleString()}円` : ""}
              {ev.fee_amount && ev.fee_note ? "(" : ""}
              {ev.fee_note}
              {ev.fee_amount && ev.fee_note ? ")" : ""}
            </p>
          )}
          {ev.description && (
            <p className="mt-4 whitespace-pre-wrap text-gray-700">
              {ev.description}
            </p>
          )}

          {registration?.attending && (
            <div className="mt-6 card bg-primary-light">
              <p className="text-sm text-gray-700">
                参加登録済みです。当日は他の参加者とのマッチングもお楽しみください。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/mypage/matching/${ev.id}`}
                  className="btn-primary"
                >
                  参加者とマッチングする
                </Link>
                <a
                  href={buildGoogleCalendarUrl({
                    id: ev.id,
                    title: ev.title,
                    eventDate: ev.event_date,
                    startTime: ev.start_time,
                    endTime: ev.end_time,
                    venue: ev.venue,
                    description: ev.description,
                    appUrl:
                      process.env.NEXT_PUBLIC_APP_URL ||
                      "https://koryukai-connect.vercel.app",
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  📅 Googleカレンダーに追加
                </a>
                <a href={`/api/events/${ev.id}/ics`} className="btn-ghost">
                  他のカレンダー(.ics)
                </a>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">参加登録フォーム</h2>
          <RegistrationForm
            event={ev}
            registration={(registration as RegistrationRow) || null}
            profile={(profile as Profile) || null}
            refCode={refCode}
          />
        </div>
      </div>
    </div>
  );
}

// 未ログインの人向けの交流会ページ(仮説2の検証用)。内容を見せてから参加登録に進める。
function PublicEventDetail({ ev }: { ev: EventRow }) {
  const isOpen = ev.status === "upcoming";
  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/events"
        className="mb-4 inline-block text-sm text-gray-500 hover:text-primary"
      >
        ← 交流会一覧に戻る
      </Link>
      <div className="card">
        <p className="text-sm text-gray-500">{formatEventDate(ev.event_date)}</p>
        <h1 className="mt-1 text-xl font-bold">{ev.title}</h1>
        {ev.venue && <p className="mt-2 text-gray-600">会場: {ev.venue}</p>}
        {ev.start_time && (
          <p className="mt-1 text-gray-600">
            時間: {ev.start_time.slice(0, 5)}
            {ev.end_time ? `〜${ev.end_time.slice(0, 5)}` : ""}
          </p>
        )}
        {(ev.fee_note || ev.fee_amount) && (
          <p className="mt-1 text-gray-600">
            参加費:{" "}
            {ev.fee_amount ? `${ev.fee_amount.toLocaleString()}円` : ""}
            {ev.fee_amount && ev.fee_note ? "(" : ""}
            {ev.fee_note}
            {ev.fee_amount && ev.fee_note ? ")" : ""}
          </p>
        )}
        {ev.capacity ? (
          <p className="mt-1 text-gray-600">定員: {ev.capacity}名</p>
        ) : null}
        {ev.description && (
          <p className="mt-4 whitespace-pre-wrap text-gray-700">{ev.description}</p>
        )}

        <div className="mt-6 border-t border-gray-100 pt-5">
          {isOpen ? (
            <>
              <a href={`/events/${ev.id}/join`} className="btn-primary w-full text-center">
                この交流会に参加登録する
              </a>
              <p className="mt-2 text-xs text-gray-500">
                参加登録の前に、お名前とメールアドレス(またはGoogle)でアカウントを作成します。
                作成後、そのままこのページの登録フォームに戻ります。
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">この交流会は受付を終了しました。</p>
          )}
        </div>
      </div>
    </div>
  );
}
