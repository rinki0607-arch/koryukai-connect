"use client";

import { useMemo, useState } from "react";
import { DirectoryEntry } from "@/lib/types";

export default function MemberDirectory({
  entries,
}: {
  entries: DirectoryEntry[];
}) {
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");

  const industries = useMemo(
    () =>
      Array.from(
        new Set(entries.map((e) => e.industry).filter((v): v is string => !!v))
      ).sort(),
    [entries]
  );

  const filtered = entries.filter((e) => {
    if (industryFilter && e.industry !== industryFilter) return false;
    if (search) {
      const haystack = `${e.name || ""} ${e.company || ""} ${
        e.connect_with || ""
      } ${(e.connect_with_tags || []).join(" ")}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="label">検索(氏名・会社・繋がりたい人)</label>
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="例: 田中 / IT / 資金調達"
          />
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
      </div>

      <p className="mb-3 text-sm text-gray-500">{filtered.length} 名</p>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">
          該当する参加者が見つかりませんでした。
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((e) => (
            <div key={e.participant_id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{e.name || "(名前未設定)"}</p>
                  {e.company && (
                    <p className="text-sm text-gray-500">{e.company}</p>
                  )}
                </div>
                {e.events_attended > 0 && (
                  <span className="badge shrink-0 bg-primary-light text-primary">
                    参加{e.events_attended}回
                  </span>
                )}
              </div>

              {e.industry && (
                <p className="mt-2 text-sm text-gray-600">
                  業種: {e.industry}
                </p>
              )}

              {(e.connect_with_tags && e.connect_with_tags.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {e.connect_with_tags.map((tag) => (
                    <span
                      key={tag}
                      className="badge bg-gray-100 text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {e.connect_with && (
                <p className="mt-2 text-sm text-gray-600">
                  繋がりたい人: {e.connect_with}
                </p>
              )}

              {e.bio && (
                <p className="mt-3 whitespace-pre-wrap border-t border-gray-100 pt-3 text-sm text-gray-700">
                  {e.bio}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
