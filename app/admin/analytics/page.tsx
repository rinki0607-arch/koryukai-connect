import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel, formatEventDate } from "@/lib/constants";
import { EventFeedbackSummary } from "@/lib/types";
import BarList from "@/components/BarList";

export const dynamic = "force-dynamic";

interface RegRow {
  attending: boolean;
  afterparty: boolean;
  industry: string | null;
  connect_with_tags: string[] | null;
  events: { event_date: string } | null;
}

function topEntries(counts: Map<string, number>, limit = 8) {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  const [{ data, error }, { data: attendanceData }, { data: feedbackData }] =
    await Promise.all([
      supabase
        .from("registrations")
        .select("attending, afterparty, industry, connect_with_tags, events(event_date)"),
      supabase
        .from("attendance")
        .select("participant_id, checked_in_at")
        .not("checked_in_at", "is", null),
      supabase.rpc("get_event_feedback_summary"),
    ]);

  const feedbackSummary = (feedbackData as EventFeedbackSummary[]) || [];

  const rows = (data as unknown as RegRow[]) || [];
  const attendingRows = rows.filter((r) => r.attending);

  const attendanceCounts = new Map<string, number>();
  for (const a of (attendanceData as { participant_id: string }[]) || []) {
    attendanceCounts.set(
      a.participant_id,
      (attendanceCounts.get(a.participant_id) || 0) + 1
    );
  }
  const segmentCounts = { "1回": 0, "2回": 0, "3回": 0, "4回以上": 0 };
  for (const count of attendanceCounts.values()) {
    if (count === 1) segmentCounts["1回"] += 1;
    else if (count === 2) segmentCounts["2回"] += 1;
    else if (count === 3) segmentCounts["3回"] += 1;
    else segmentCounts["4回以上"] += 1;
  }
  const activeParticipants = attendanceCounts.size;
  const coreRate =
    activeParticipants > 0
      ? Math.round((segmentCounts["4回以上"] / activeParticipants) * 100)
      : 0;

  const industryCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();

  for (const r of attendingRows) {
    if (r.industry) {
      industryCounts.set(r.industry, (industryCounts.get(r.industry) || 0) + 1);
    }
    for (const tag of r.connect_with_tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
    if (r.events?.event_date) {
      const label = formatMonthLabel(r.events.event_date);
      monthCounts.set(label, (monthCounts.get(label) || 0) + 1);
    }
  }

  const afterpartyWish = attendingRows.filter((r) => r.afterparty).length;
  const afterpartyRate =
    attendingRows.length > 0
      ? Math.round((afterpartyWish / attendingRows.length) * 100)
      : 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-2 text-xl font-bold">全体集計・分析</h1>
        <p className="text-sm text-gray-500">
          これまでの参加登録データ({attendingRows.length}件)を集計したものです。
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600">読み込みに失敗しました: {error.message}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">累計参加登録数</p>
          <p className="mt-1 text-3xl font-bold">{attendingRows.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">二次会参加希望率</p>
          <p className="mt-1 text-3xl font-bold">{afterpartyRate}%</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">登録された業種の種類数</p>
          <p className="mt-1 text-3xl font-bold">{industryCounts.size}</p>
        </div>
      </div>

      {feedbackSummary.length > 0 && (
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-semibold">参加後アンケート・NPS</h2>
            <p className="mt-1 text-sm text-gray-500">
              各回の満足度アンケート回答をもとにした、開催回ごとのNPS(推奨度)と平均満足度です。
            </p>
          </div>
          <div className="space-y-3">
            {feedbackSummary.map((f) => (
              <div key={f.event_id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">
                      {formatEventDate(f.event_date)}
                    </p>
                    <p className="font-semibold">{f.title}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      回答数 {f.response_count}件 / 平均満足度 {f.avg_rating}
                      <span className="text-accent-dark"> ★</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">NPS</p>
                    <p
                      className={`text-2xl font-bold ${
                        f.nps >= 0 ? "text-primary" : "text-red-500"
                      }`}
                    >
                      {f.nps > 0 ? `+${f.nps}` : f.nps}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-1.5 overflow-hidden rounded-full">
                  {f.promoters > 0 && (
                    <div
                      className="h-2 bg-primary"
                      style={{
                        width: `${(f.promoters / f.response_count) * 100}%`,
                      }}
                    />
                  )}
                  {f.neutrals > 0 && (
                    <div
                      className="h-2 bg-gray-200"
                      style={{
                        width: `${(f.neutrals / f.response_count) * 100}%`,
                      }}
                    />
                  )}
                  {f.detractors > 0 && (
                    <div
                      className="h-2 bg-red-300"
                      style={{
                        width: `${(f.detractors / f.response_count) * 100}%`,
                      }}
                    />
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  また来たい {f.promoters} / どちらとも {f.neutrals} / あまり{" "}
                  {f.detractors}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">参加者セグメント(参加回数別)</h2>
          <p className="mt-1 text-sm text-gray-500">
            QR受付の記録に基づく、これまでの累計参加(チェックイン)回数の分布です。常連化の度合いを把握し、再訪を促す施策の判断材料としてご活用ください。
          </p>
        </div>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div className="card">
            <p className="text-sm text-gray-500">受付実績のある参加者数</p>
            <p className="mt-1 text-3xl font-bold">{activeParticipants}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">常連率(4回以上参加)</p>
            <p className="mt-1 text-3xl font-bold text-accent-dark">{coreRate}%</p>
          </div>
        </div>
        <div className="card">
          <BarList
            items={Object.entries(segmentCounts).map(([label, value]) => ({
              label,
              value,
            }))}
            unit="人"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">月別 参加登録数の推移</h2>
        <div className="card">
          <BarList
            items={topEntries(monthCounts, 12).sort((a, b) =>
              a.label.localeCompare(b.label, "ja")
            )}
            unit="件"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">業種別 参加者数</h2>
        <div className="card">
          <BarList items={topEntries(industryCounts)} unit="人" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">「繋がりたい人」タグの傾向</h2>
        <div className="card">
          <BarList items={topEntries(tagCounts)} unit="件" />
        </div>
      </section>
    </div>
  );
}
