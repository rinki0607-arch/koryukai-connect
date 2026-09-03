"use client";

import { useMemo, useState } from "react";
import { BusinessCard } from "@/lib/types";
import Avatar from "@/components/Avatar";
import DeleteCardButton from "@/components/DeleteCardButton";

export default function CardList({ cards }: { cards: BusinessCard[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return cards;
    const q = search.toLowerCase();
    return cards.filter((c) =>
      `${c.name} ${c.company} ${c.job_title}`.toLowerCase().includes(q)
    );
  }, [cards, search]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">保存済みの名刺({cards.length}件)</h2>
        {cards.length > 3 && (
          <input
            className="input max-w-[200px]"
            placeholder="氏名・会社名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-gray-500">まだ名刺が登録されていません。</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">該当する名刺が見つかりませんでした。</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="card flex items-start gap-3">
              <Avatar name={c.name} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {c.name || "(氏名未設定)"}
                  {c.company ? `(${c.company})` : ""}
                </p>
                {c.job_title && (
                  <p className="mt-0.5 text-sm text-gray-500">{c.job_title}</p>
                )}
                <div className="mt-1 space-y-0.5 text-sm text-gray-600">
                  {c.phone && <p>📞 {c.phone}</p>}
                  {c.email && <p>✉️ {c.email}</p>}
                </div>
                {c.note && (
                  <p className="mt-1.5 whitespace-pre-wrap text-xs text-gray-400">
                    {c.note}
                  </p>
                )}
              </div>
              <DeleteCardButton cardId={c.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
