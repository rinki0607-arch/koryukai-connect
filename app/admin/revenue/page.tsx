import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/constants";
import { AdminRevenueSummary } from "@/lib/types";
import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function yen(n: number) {
  return `${n.toLocaleString()}円`;
}

export default async function AdminRevenuePage() {
  const supabase = await createClient();

  // 売上集計(DB)とStripe設定済みかの確認(こちらもDBを見に行く)は
  // 互いに無関係なので同時に取得する。
  const [{ data, error }, stripeConfigured] = await Promise.all([
    supabase.rpc("get_admin_revenue_summary"),
    isStripeConfigured(),
  ]);
  const rows = (data as AdminRevenueSummary[]) || [];

  const totalRevenue = rows.reduce((sum, r) => sum + (r.total_revenue || 0), 0);
  const totalPaid = rows.reduce((sum, r) => sum + (r.paid_count || 0), 0);
  const totalUnpaid = rows.reduce((sum, r) => sum + (r.unpaid_count || 0), 0);
  const totalPending = rows.reduce((sum, r) => sum + (r.pending_count || 0), 0);

  const feeEvents = rows.filter((r) => !!r.fee_amount);

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold">決済・売上ダッシュボード</h1>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Stripeでのオンライン決済の集金状況・売上を確認できます。参加費(金額)が設定されている交流会のみ対象です。
      </p>

      {!stripeConfigured && (
        <div className="card mb-6 border-amber-200 bg-amber-50 text-sm text-amber-800">
          ⚠️ Stripeのオンライン決済が未設定です。設定が完了するまで、参加者側にも決済ボタンは表示されません。{" "}
          <Link href="/admin/settings/payments" className="font-semibold underline">
            決済設定ページから設定する →
          </Link>
        </div>
      )}

      {error && (
        <p className="card text-sm text-red-600">読み込みに失敗しました: {error.message}</p>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <div className="card">
          <p className="text-sm text-gray-500">総売上(累計)</p>
          <p className="mt-1 text-2xl font-bold text-primary">{yen(totalRevenue)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">支払い済み</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{totalPaid}件</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">未払い</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{totalUnpaid}件</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">決済手続き中</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{totalPending}件</p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">交流会ごとの集金状況</h2>
      {feeEvents.length === 0 ? (
        <p className="text-sm text-gray-500">
          参加費(金額)が設定されている交流会がまだありません。交流会編集画面で「参加費・金額」を入力すると、ここに表示されます。
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2 pr-4">開催日</th>
                <th className="py-2 pr-4">交流会</th>
                <th className="py-2 pr-4">参加費</th>
                <th className="py-2 pr-4">参加登録</th>
                <th className="py-2 pr-4">支払済</th>
                <th className="py-2 pr-4">未払</th>
                <th className="py-2 pr-4">手続き中</th>
                <th className="py-2 pr-4">売上</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {feeEvents.map((r) => (
                <tr key={r.event_id} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 whitespace-nowrap text-gray-500">
                    {formatEventDate(r.event_date)}
                  </td>
                  <td className="py-2.5 pr-4 font-medium">{r.title}</td>
                  <td className="py-2.5 pr-4 whitespace-nowrap">{yen(r.fee_amount || 0)}</td>
                  <td className="py-2.5 pr-4">{r.attending_count}名</td>
                  <td className="py-2.5 pr-4 text-green-700">{r.paid_count}</td>
                  <td className="py-2.5 pr-4 text-red-600">{r.unpaid_count}</td>
                  <td className="py-2.5 pr-4 text-amber-600">{r.pending_count}</td>
                  <td className="py-2.5 pr-4 font-semibold">{yen(r.total_revenue)}</td>
                  <td className="py-2.5">
                    <Link
                      href={`/admin/revenue/${r.event_id}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      明細を見る →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
