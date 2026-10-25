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

  // ログイン確認と交流会情報の取得は互いに無関係なので同時に行う。
  // 権限(role)の確認はuser.idが分かった後でないと行えないため、引き続き順番に行う。
  const [{ data: { user } }, { data: event }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("events").select("*").eq("id", eventId).single(),
  ]);
  if (!user) redirect(`/login?next=/admin/checkin/${eventId}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

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
