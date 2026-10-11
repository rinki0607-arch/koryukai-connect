import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AttendeeCandidate } from "@/lib/types";
import AttendeeList from "@/components/AttendeeList";

export const dynamic = "force-dynamic";

export default async function MatchingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/mypage/matching/${eventId}`);

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();

  const { data, error } = await supabase.rpc("get_event_attendees", {
    p_event_id: eventId,
  });

  const attendees = (data as AttendeeCandidate[]) || [];

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">参加者マッチング</h1>
      <p className="text-sm text-gray-500">{event?.title}</p>
      {!error && attendees.length > 0 && (
        <p className="mb-6 mt-1 text-xs text-gray-400">
          共通のタグ・業種をもとに相性が高い順に並んでいます
        </p>
      )}
      {(error || attendees.length === 0) && <div className="mb-6" />}

      {error && (
        <p className="card text-sm text-red-600">
          この交流会に「参加する」で登録していないため、他の参加者は表示できません。
          先に参加登録を行ってください。
        </p>
      )}

      {!error && attendees.length === 0 && (
        <p className="text-sm text-gray-500">
          現在、他に参加登録している方はいません。
        </p>
      )}

      {!error && attendees.length > 0 && (
        <AttendeeList eventId={eventId} attendees={attendees} />
      )}

      <p className="mt-6 text-sm text-gray-500">
        お互いに「話してみたい」を選ぶとマッチが成立し、
        <Link href="/mypage/matches" className="text-primary hover:underline">
          メッセージ
        </Link>
        からチャットできるようになります。
      </p>
    </div>
  );
}
