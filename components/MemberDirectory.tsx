"use client";

import { useMemo, useState } from "react";
import { DirectoryEntry } from "@/lib/types";
import MemberCard from "@/components/MemberCard";

export default function MemberDirectory({
  entries,
}: {
  entries: DirectoryEntry[];
}) {
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);

  const industries = useMemo(
    () =>
      Array.from(
        new Set(entries.map((e) => e.industry).filter((v): v is string => !!v))
      ).sort(),
    [entries]
  );

  const filtered = entries.filter((e) => {
    if (savedOnly && !e.is_saved) return false;
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
      <div className="card mb-5 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="label">検索(氏名・会社・繋がりたい人)</label>
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="例: 田中 / IT / 資金調達"
            />
          </div>
          <div className="min-w-[140px]">
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
        <div className="segment max-w-[240px]">
          <button
            type="button"
            onClick={() => setSavedOnly(false)}
            className={`segment-option ${!savedOnly ? "is-active" : ""}`}
          >
            すべて表示
          </button>
          <button
            type="button"
            onClick={() => setSavedOnly(true)}
            className={`segment-option ${savedOnly ? "is-active" : ""}`}
          >
            ⭐ 保存済み
          </button>
        </div>
      </div>

      <p className="mb-3 text-sm text-gray-500">{filtered.length} 名</p>

      {filtered.length === 0 ? (
        <p className="card text-center text-sm text-gray-500">
          該当する参加者が見つかりませんでした。
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <MemberCard key={e.participant_id} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
