"use client";

export interface EventParticipantRow {
  participant_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_type: string | null;
  job_title: string | null;
  industry: string | null;
  connect_with: string | null;
  connect_with_tags: string[] | null;
  attending: boolean;
  afterparty: boolean;
}

export default function EventParticipantsTable({
  eventTitle,
  rows,
}: {
  eventTitle: string;
  rows: EventParticipantRow[];
}) {
  function exportCsv() {
    const header = [
      "氏名",
      "メール",
      "電話番号",
      "会社",
      "役職",
      "職種",
      "業種",
      "繋がりたい人",
      "タグ",
      "参加",
      "二次会",
    ];
    const lines = rows.map((r) =>
      [
        r.name || "",
        r.email || "",
        r.phone || "",
        r.company || "",
        r.job_title || "",
        r.job_type || "",
        r.industry || "",
        (r.connect_with || "").replace(/\n/g, " "),
        (r.connect_with_tags || []).join("/"),
        r.attending ? "参加" : "不参加",
        r.afterparty ? "希望" : "希望しない",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = "﻿" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventTitle}_participants.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500">まだ参加登録がありません。</p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">{rows.length} 件の登録</p>
        <button onClick={exportCsv} className="btn-secondary">
          CSV出力
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                "氏名",
                "会社",
                "職種",
                "業種",
                "繋がりたい人",
                "参加",
                "二次会",
                "",
              ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left font-medium text-gray-500"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.participant_id}>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.company}</td>
                <td className="px-3 py-2">{r.job_type}</td>
                <td className="px-3 py-2">{r.industry}</td>
                <td className="px-3 py-2">{r.connect_with}</td>
                <td className="px-3 py-2">
                  {r.attending ? "参加" : "不参加"}
                </td>
                <td className="px-3 py-2">{r.afterparty ? "希望" : ""}</td>
                <td className="px-3 py-2">
                  <a
                    href={`/admin/participants/${r.participant_id}`}
                    className="text-primary hover:underline"
                  >
                    詳細
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
