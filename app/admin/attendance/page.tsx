import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface AttendanceJoined {
  participant_id: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  events: { title: string; event_date: string } | null;
  profiles: { name: string | null; company: string | null; industry: string | null } | null;
}

export default async function AdminAttendancePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attendance")
    .select(
      "participant_id, checked_in_at, checked_out_at, events(title, event_date), profiles(name, company, industry)"
    )
    .not("checked_in_at", "is", null)
    .order("checked_in_at", { ascending: false });

  const rows = (data as unknown as AttendanceJoined[]) || [];

  const byParticipant = new Map<
    string,
    {
      name: string | null;
      company: string | null;
      industry: string | null;
      count: number;
      lastEvent: string | null;
      lastDate: string | null;
    }
  >();

  for (const r of rows) {
    const key = r.participant_id;
    const cur = byParticipant.get(key);
    if (cur) {
      cur.count += 1;
    } else {
      byParticipant.set(key, {
        name: r.profiles?.name ?? null,
        company: r.profiles?.company ?? null,
        industry: r.profiles?.industry ?? null,
        count: 1,
        lastEvent: r.events?.title ?? null,
        lastDate: r.events?.event_date ?? null,
      });
    }
  }

  const ranking = Array.from(byParticipant.values()).sort(
    (a, b) => b.count - a.count
  );

  return (
    <div>
      <h1 className="mb-2 text-xl font-bold">参加実績ダッシュボード</h1>
      <p className="mb-6 text-sm text-gray-500">
        QR受付で記録された、これまでの交流会への参加(チェックイン)回数のランキングです。
      </p>

      {error && (
        <p className="text-sm text-red-600">読み込みに失敗しました: {error.message}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">延べ受付人数</p>
          <p className="mt-1 text-3xl font-bold">{rows.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">受付済みのユニーク参加者数</p>
          <p className="mt-1 text-3xl font-bold">{byParticipant.size}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">最多参加回数</p>
          <p className="mt-1 text-3xl font-bold">
            {ranking[0]?.count ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["順位", "氏名", "会社", "業種", "参加回数"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left font-medium text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ranking.map((r, i) => (
              <tr key={i}>
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{r.name || "-"}</td>
                <td className="px-3 py-2">{r.company || "-"}</td>
                <td className="px-3 py-2">{r.industry || "-"}</td>
                <td className="px-3 py-2">{r.count}</td>
              </tr>
            ))}
            {ranking.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                  まだQR受付の記録がありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
