import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/constants";
import QrScanner from "@/components/QrScanner";

export const dynamic = "force-dynamic";

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/admin/checkin/${eventId}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (!event) notFound();

  const ev = event as EventRow;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-xl font-bold">QR受付</h1>
      <p className="mb-6 text-sm text-gray-500">
        {ev.title} ({formatEventDate(ev.event_date)})
      </p>
      <QrScanner eventId={eventId} />
    </div>
  );
}
