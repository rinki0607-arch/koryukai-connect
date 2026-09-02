"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface ParticipantRow {
  participant_id: string;
  event_title: string;
  event_date: string;
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

export default function ParticipantsTable({
  rows,
}: {
  rows: ParticipantRow[];
}) {
  const [eventFilter, setEventFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [search, setSearch] = useState("");

  const events = useMemo(
    () => Array.from(new Set(rows.map((r) => r.event_title))),
    [rows]
  );
  const industries = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.industry).filter((v): v is string => !!v))
      ),
    [rows]
  );

  const filtered = rows.filter((r) => {
    if (eventFilter && r.event_title !== eventFilter) return false;
    if (industryFilter && r.industry !== industryFilter) return false;
    if (search) {
      const haystack = `${r.name} ${r.company} ${r.connect_with}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  function exportCsv() {
    const header = [
      "交流会",
      "開催日",
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
    const lines = filtered.map((r) =>
      [
        r.event_title,
        r.event_date,
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
    a.download = "participants.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">交流会</label>
          <select
            className="input"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="">すべて</option>
            {events.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">業種</label>
          <select
            className="input"
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
          >
            <option value="">すべて</option>
            {industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="label">検索(氏名・会社・繋がりたい人)</label>
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={exportCsv} className="btn-secondary">
          CSV出力
        </button>
      </div>

      <p className="mb-2 text-sm text-gray-500">{filtered.length} 件</p>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                "交流会",
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
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r, i) => (
              <tr key={i}>
                <td className="px-3 py-2">{r.event_title}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.company}</td>
                <td className="px-3 py-2">{r.job_type}</td>
                <td className="px-3 py-2">{r.industry}</td>
                <td className="px-3 py-2">{r.connect_with}</td>
                <td className="px-3 py-2">
                  {r.attending ? "参加" : "不参加"}
                </td>
                <td className="px-3 py-2">
                  {r.afterparty ? "希望" : ""}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/participants/${r.participant_id}`}
                    className="text-primary hover:underline"
                  >
                    詳細
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
