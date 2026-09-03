import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventRow, Profile, RegistrationRow } from "@/lib/types";
import { formatEventDate } from "@/lib/constants";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import RegistrationForm from "@/components/RegistrationForm";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/events/${id}`);
  }

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) notFound();

  const { data: registration } = await supabase
    .from("registrations")
    .select("*")
    .eq("event_id", id)
    .eq("participant_id", user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const ev = event as EventRow;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <p className="text-sm text-gray-500">{formatEventDate(ev.event_date)}</p>
        <h1 className="mt-1 text-xl font-bold">{ev.title}</h1>
        {ev.venue && <p className="mt-2 text-gray-600">会場: {ev.venue}</p>}
        {ev.start_time && (
          <p className="mt-1 text-gray-600">
            時間: {ev.start_time.slice(0, 5)}
            {ev.end_time ? `〜${ev.end_time.slice(0, 5)}` : ""}
          </p>
        )}
        {ev.fee_note && (
          <p className="mt-1 text-gray-600">参加費: {ev.fee_note}</p>
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
        />
      </div>
    </div>
  );
}
