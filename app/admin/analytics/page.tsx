import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel } from "@/lib/constants";
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

  const { data, error } = await supabase
    .from("registrations")
    .select("attending, afterparty, industry, connect_with_tags, events(event_date)");

  const rows = (data as unknown as RegRow[]) || [];
  const attendingRows = rows.filter((r) => r.attending);

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
