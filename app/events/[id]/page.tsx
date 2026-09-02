import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventRow, Profile, RegistrationRow } from "@/lib/types";
import { formatEventDate } from "@/lib/constants";
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
            <Link
              href={`/mypage/matching/${ev.id}`}
              className="btn-primary mt-3 inline-flex"
            >
              参加者とマッチングする
            </Link>
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
