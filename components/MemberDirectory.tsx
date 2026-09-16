"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DirectoryEntry } from "@/lib/types";
import Avatar from "@/components/Avatar";
import MemberActions from "@/components/MemberActions";

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
        <label className="mb-2 flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={savedOnly}
            onChange={(e) => setSavedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-accent"
          />
          ⭐ 保存済みのみ表示
        </label>
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
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/members/${e.participant_id}`}
                  className="flex items-start gap-3"
                >
                  <Avatar name={e.name} avatarUrl={e.avatar_url} />
                  <div>
                    <p className="font-semibold leading-tight hover:text-primary">
                      {e.name || "(名前未設定)"}
                    </p>
                    {(e.job_title || e.company) && (
                      <p className="mt-0.5 text-sm text-gray-500">
                        {[e.job_title, e.company].filter(Boolean).join(" / ")}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {e.events_attended > 0 && (
                    <span className="badge bg-primary-light text-primary">
                      参加{e.events_attended}回
                    </span>
                  )}
                  {e.is_matched && (
                    <span className="badge bg-green-100 text-green-700">
                      マッチ済み
                    </span>
                  )}
                </div>
              </div>

              {(e.job_type || e.industry) && (
                <p className="mt-2 text-sm text-gray-600">
                  {[e.job_type, e.industry].filter(Boolean).join(" ・ ")}
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

              <MemberActions
                participantId={e.participant_id}
                isSaved={e.is_saved}
                alreadyLiked={e.already_liked}
                isMatched={e.is_matched}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
