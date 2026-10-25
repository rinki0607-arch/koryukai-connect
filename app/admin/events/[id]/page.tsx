import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventRow } from "@/lib/types";
import EventForm from "@/components/EventForm";
import EventParticipantsTable, {
  EventParticipantRow,
} from "@/components/EventParticipantsTable";
import NotifyButton from "@/components/NotifyButton";
import { updateEvent, deleteEvent } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 交流会本体・参加登録数・受付済み数・参加者一覧は、いずれもidだけで決まり
  // 互いに結果を必要としないので、以前は4回順番に待っていた問い合わせを
  // 同時に実行する。
  const [
    { data: event },
    { count: registeredCount },
    { count: checkedInCount },
    { data: registrations },
  ] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("attending", true),
    supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id)
      .not("checked_in_at", "is", null),
    supabase
      .from("registrations")
      .select(
        "participant_id, attending, afterparty, industry, connect_with, connect_with_tags, profiles(name, email, phone, company, job_type, job_title)"
      )
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!event) notFound();

  const participantRows: EventParticipantRow[] = (registrations || []).map(
    (r: any) => ({
      participant_id: r.participant_id,
      name: r.profiles?.name || null,
      email: r.profiles?.email || null,
      phone: r.profiles?.phone || null,
      company: r.profiles?.company || null,
      job_type: r.profiles?.job_type || null,
      job_title: r.profiles?.job_title || null,
      industry: r.industry,
      connect_with: r.connect_with,
      connect_with_tags: r.connect_with_tags,
      attending: r.attending,
      afterparty: r.afterparty,
    })
  );

  const ev = event as EventRow;
  const boundUpdate = updateEvent.bind(null, id);
  const boundDelete = deleteEvent.bind(null, id);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-xl font-bold">{ev.title} を編集</h1>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-gray-500">
            参加登録: {registeredCount ?? 0} 名 / 受付済み: {checkedInCount ?? 0} 名
          </p>
          <Link href={`/admin/checkin/${id}`} className="btn-primary">
            QR受付を開始
          </Link>
        </div>
        <EventForm event={ev} action={boundUpdate} />

        <form action={boundDelete}>
          <button
            type="submit"
            className="text-sm text-red-600 hover:underline"
          >
            この交流会を削除する
          </button>
        </form>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">参加者への通知</h2>
          <p className="text-xs text-gray-500">
            {ev.notified_at
              ? `送信済み: ${new Date(ev.notified_at).toLocaleString(
                  "ja-JP"
                )}(${ev.notified_count ?? 0}名)`
              : "未送信"}
          </p>
        </div>
        <NotifyButton eventId={id} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">この交流会の参加者一覧</h2>
        <EventParticipantsTable eventTitle={ev.title} rows={participantRows} />
      </div>
    </div>
  );
}
