import Link from "next/link";
import { CapitalSummary } from "@/lib/types";

function formatTenure(fromIso: string | null): string | null {
  if (!fromIso) return null;
  const from = new Date(fromIso);
  const now = new Date();
  let months =
    (now.getFullYear() - from.getFullYear()) * 12 +
    (now.getMonth() - from.getMonth());
  if (now.getDate() < from.getDate()) months -= 1;
  months = Math.max(0, months);

  if (months < 1) return "今月から";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest}ヶ月前から`;
  if (rest === 0) return `${years}年前から`;
  return `${years}年${rest}ヶ月前から`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CapitalSummaryCard({
  summary,
}: {
  summary: CapitalSummary;
}) {
  const tenure = formatTenure(summary.first_attended_at);

  const tiles = [
    { label: "参加した交流会", value: summary.events_attended, unit: "回" },
    { label: "つながった人数", value: summary.connections_count, unit: "人" },
    { label: "交わしたメッセージ", value: summary.messages_count, unit: "通" },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 bg-primary-light/60 px-6 py-4">
        <p className="font-mono text-[11px] font-bold tracking-widest text-accent-dark">
          YOUR HUMAN CAPITAL
        </p>
        <h2 className="mt-1 font-display text-lg font-bold text-primary">
          あなたの人的資本
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          交流会で生まれたつながりは、一度きりで終わらせず、ここに資産として積み重なっていきます。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white px-6 py-5">
            <p className="text-xs text-gray-500">{t.label}</p>
            <p className="mt-1 font-mono text-3xl font-bold text-primary">
              {t.value}
              <span className="ml-1 text-base font-medium text-gray-400">
                {t.unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      {(tenure || summary.latest_partner_name) && (
        <div className="flex flex-col gap-2 border-t border-gray-100 px-6 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          {tenure && (
            <p>
              <span className="text-gray-400">{tenure}</span>{" "}
              人的資本を育てています
            </p>
          )}
          {summary.latest_partner_name && (
            <p>
              直近のつながり:{" "}
              <Link
                href="/mypage/matches"
                className="font-medium text-primary hover:underline"
              >
                {summary.latest_partner_name}さん
              </Link>
              {summary.latest_matched_at && (
                <span className="text-gray-400">
                  ({formatDate(summary.latest_matched_at)})
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
