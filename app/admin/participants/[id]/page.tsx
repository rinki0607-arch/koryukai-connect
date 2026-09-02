import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";
import { formatEventDate } from "@/lib/constants";
import ParticipantEditForm from "@/components/ParticipantEditForm";

export const dynamic = "force-dynamic";

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const [
    { data: registrations },
    { data: attendance },
    { data: sentLikes },
    { data: receivedLikes },
  ] = await Promise.all([
    supabase
      .from("registrations")
      .select("*, events(title, event_date)")
      .eq("participant_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("attendance")
      .select("*, events(title, event_date)")
      .eq("participant_id", id)
      .order("checked_in_at", { ascending: false }),
    supabase
      .from("likes")
      .select("event_id, to_id, created_at")
      .eq("from_id", id),
    supabase
      .from("likes")
      .select("event_id, from_id, created_at")
      .eq("to_id", id),
  ]);

  const mutualPartnerIds = new Set(
    (sentLikes || [])
      .filter((s) =>
        (receivedLikes || []).some(
          (r) => r.event_id === s.event_id && r.from_id === s.to_id
        )
      )
      .map((s) => s.to_id)
  );

  let matchProfiles: { id: string; name: string | null; company: string | null; email: string | null }[] = [];
  if (mutualPartnerIds.size > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, company, email")
      .in("id", Array.from(mutualPartnerIds));
    matchProfiles = data || [];
  }

  const p = profile as Profile;
  const isSelf = user?.id === p.id;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">{p.name || "(名前未設定)"}</h1>
        <p className="text-sm text-gray-500">
          {[p.email, p.phone].filter(Boolean).join(" / ")}
        </p>
        {(p.job_title || p.job_type) && (
          <p className="mt-1 text-sm text-gray-500">
            {[p.job_title, p.job_type].filter(Boolean).join(" / ")}
          </p>
        )}
      </div>

      <ParticipantEditForm profile={p} isSelf={isSelf} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">参加登録履歴</h2>
        {!registrations || registrations.length === 0 ? (
          <p className="text-sm text-gray-500">登録履歴はありません。</p>
        ) : (
          <div className="space-y-2">
            {registrations.map((r: any) => (
              <div key={r.id} className="card flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">
                    {r.events ? formatEventDate(r.events.event_date) : ""}
                  </p>
                  <p className="font-medium">{r.events?.title}</p>
                </div>
                <span
                  className={`badge ${
                    r.attending
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {r.attending ? "参加" : "不参加"}
                  {r.attending && r.afterparty ? " / 二次会希望" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          QR受付履歴(出席実績: {attendance?.length ?? 0}回)
        </h2>
        {!attendance || attendance.length === 0 ? (
          <p className="text-sm text-gray-500">まだ受付記録はありません。</p>
        ) : (
          <div className="space-y-2">
            {attendance.map((a: any) => (
              <div key={a.id} className="card">
                <p className="font-medium">{a.events?.title}</p>
                <p className="text-sm text-gray-500">
                  入場:{" "}
                  {a.checked_in_at
                    ? new Date(a.checked_in_at).toLocaleString("ja-JP")
                    : "-"}
                  {"  "}/ 退出:{" "}
                  {a.checked_out_at
                    ? new Date(a.checked_out_at).toLocaleString("ja-JP")
                    : "-"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          マッチ成立数: {matchProfiles.length}
        </h2>
        {matchProfiles.length === 0 ? (
          <p className="text-sm text-gray-500">まだマッチはありません。</p>
        ) : (
          <div className="space-y-2">
            {matchProfiles.map((m) => (
              <div key={m.id} className="card">
                <p className="font-medium">
                  {m.name || "(名前未設定)"}
                  {m.company ? `(${m.company})` : ""}
                </p>
                <p className="text-sm text-gray-500">{m.email}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
