import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventRow } from "@/lib/types";
import EventForm from "@/components/EventForm";
import { updateEvent, deleteEvent } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) notFound();

  const { count: registeredCount } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", id)
    .eq("attending", true);

  const { count: checkedInCount } = await supabase
    .from("attendance")
    .select("*", { count: "exact", head: true })
    .eq("event_id", id)
    .not("checked_in_at", "is", null);

  const boundUpdate = updateEvent.bind(null, id);
  const boundDelete = deleteEvent.bind(null, id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{(event as EventRow).title} を編集</h1>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-500">
          参加登録: {registeredCount ?? 0} 名 / 受付済み: {checkedInCount ?? 0} 名
        </p>
        <Link href={`/admin/checkin/${id}`} className="btn-primary">
          QR受付を開始
        </Link>
      </div>
      <EventForm event={event as EventRow} action={boundUpdate} />

      <form action={boundDelete}>
        <button type="submit" className="text-sm text-red-600 hover:underline">
          この交流会を削除する
        </button>
      </form>
    </div>
  );
}
