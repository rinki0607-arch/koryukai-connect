import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/constants";
import { EventPaymentDetail, EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  paid: "支払済",
  pending: "手続き中",
  unpaid: "未払い",
  refunded: "返金済",
};

const STATUS_COLOR: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  unpaid: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-500",
};

function yen(n: number | null) {
  return n ? `${n.toLocaleString()}円` : "-";
}

export default async function EventRevenueDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const [{ data: event }, { data, error }] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).single(),
    supabase.rpc("get_event_payment_details", { p_event_id: eventId }),
  ]);

  if (!event) notFound();
  const ev = event as EventRow;
  const details = ((data as EventPaymentDetail[]) || []).filter((d) => d.attending);

  const paidTotal = details
    .filter((d) => d.payment_status === "paid")
    .reduce((sum, d) => sum + (d.paid_amount || 0), 0);

  return (
    <div>
      <Link href="/admin/revenue" className="text-xs text-gray-400 hover:text-primary">
        ← 決済・売上ダッシュボードに戻る
      </Link>
      <div className="mt-1 mb-1 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">{ev.title}</h1>
        <span className="text-sm text-gray-500">{formatEventDate(ev.event_date)}</span>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        参加費: {ev.fee_amount ? `${ev.fee_amount.toLocaleString()}円` : "未設定"} / 売上合計:{" "}
        <span className="font-semibold text-primary">{yen(paidTotal)}</span>
      </p>

      {error && (
        <p className="card text-sm text-red-600">読み込みに失敗しました: {error.message}</p>
      )}

      {!error && details.length === 0 && (
        <p className="text-sm text-gray-500">この交流会への参加登録はまだありません。</p>
      )}

      {details.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2 pr-4">氏名</th>
                <th className="py-2 pr-4">会社</th>
                <th className="py-2 pr-4">状況</th>
                <th className="py-2 pr-4">金額</th>
                <th className="py-2 pr-4">支払日時</th>
                <th className="py-2 pr-4">領収書</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d) => (
                <tr key={d.registration_id} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 font-medium">{d.name || "(未設定)"}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{d.company || "-"}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge ${STATUS_COLOR[d.payment_status]}`}>
                      {STATUS_LABEL[d.payment_status]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">{yen(d.paid_amount)}</td>
                  <td className="py-2.5 pr-4 text-gray-500">
                    {d.paid_at
                      ? new Date(d.paid_at).toLocaleString("ja-JP", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="py-2.5 pr-4">
                    {d.wants_receipt ? (
                      d.receipt_url ? (
                        <a
                          href={d.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          {d.receipt_name ? `${d.receipt_name}宛 ` : ""}表示
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">
                          希望あり{d.receipt_name ? `(${d.receipt_name}宛)` : ""}・未発行
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
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
