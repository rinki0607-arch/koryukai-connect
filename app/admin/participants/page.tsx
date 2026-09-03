import { createClient } from "@/lib/supabase/server";
import { ParticipantActivity } from "@/lib/types";
import ParticipantsTable, {
  ParticipantRow,
} from "@/components/ParticipantsTable";
import DormantMembersPanel from "@/components/DormantMembersPanel";

export const dynamic = "force-dynamic";

export default async function AdminParticipantsPage() {
  const supabase = await createClient();

  const [{ data, error }, { data: activityData }] = await Promise.all([
    supabase
      .from("registrations")
      .select(
        "participant_id, attending, afterparty, industry, connect_with, connect_with_tags, events(title, event_date), profiles(name, email, phone, company, job_type, job_title)"
      )
      .order("created_at", { ascending: false }),
    supabase.rpc("get_participant_activity"),
  ]);

  const activityMap = new Map(
    ((activityData as ParticipantActivity[]) || []).map((a) => [
      a.participant_id,
      a,
    ])
  );

  const rows: ParticipantRow[] = (data || []).map((r: any) => ({
    participant_id: r.participant_id,
    event_title: r.events?.title || "",
    event_date: r.events?.event_date || "",
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
    last_attended_at: activityMap.get(r.participant_id)?.last_attended_at || null,
    events_attended: activityMap.get(r.participant_id)?.events_attended || 0,
  }));

  const DORMANT_MS = 1000 * 60 * 60 * 24 * 90;
  const dormantMap = new Map<
    string,
    { participant_id: string; name: string | null; email: string | null }
  >();
  for (const r of rows) {
    if (
      r.last_attended_at &&
      Date.now() - new Date(r.last_attended_at).getTime() > DORMANT_MS &&
      !dormantMap.has(r.participant_id)
    ) {
      dormantMap.set(r.participant_id, {
        participant_id: r.participant_id,
        name: r.name,
        email: r.email,
      });
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">参加者データ</h1>
      <p className="mb-4 text-sm text-gray-500">
        これまでの交流会で登録された参加者の業種・繋がりたい人の情報が、交流会をまたいで蓄積されます。
      </p>
      {error && (
        <p className="text-sm text-red-600">読み込みに失敗しました: {error.message}</p>
      )}

      <DormantMembersPanel members={Array.from(dormantMap.values())} />

      <ParticipantsTable rows={rows} />
    </div>
  );
}
