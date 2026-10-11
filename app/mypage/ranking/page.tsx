import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CapitalLeaderboardRow } from "@/lib/types";
import { CAPITAL_TIER_STYLES } from "@/lib/constants";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/ranking");

  const { data, error } = await supabase.rpc("get_capital_leaderboard", {
    p_limit: 50,
  });
  const rows = (data as CapitalLeaderboardRow[]) || [];

  return (
    <div>
      <Link href="/mypage" className="mb-3 inline-block text-sm text-primary hover:underline">
        &larr; マイページへ戻る
      </Link>
      <h1 className="mb-1 text-xl font-bold">🏆 人脈資本ランキング</h1>
      <p className="mb-6 text-sm text-gray-500">
        参加回数・つながった人数・メッセージ数から算出した「人的資本スコア」の上位メンバーです。
      </p>

      {error && (
        <p className="card text-sm text-red-600">
          読み込みに失敗しました: {error.message}
        </p>
      )}

      {!error && rows.length === 0 && (
        <p className="text-sm text-gray-500">まだランキングデータがありません。</p>
      )}

      {!error && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r) => {
            const tierStyle =
              CAPITAL_TIER_STYLES[r.capital_tier] || "bg-gray-200 text-gray-700";
            return (
              <div
                key={r.participant_id}
                className={`card flex items-center gap-3 ${
                  r.is_me ? "border-accent bg-accent/5" : ""
                }`}
              >
                <div className="flex w-10 shrink-0 items-center justify-center text-lg font-bold text-gray-400">
                  {MEDALS[r.rank] || r.rank}
                </div>
                <Avatar name={r.name} avatarUrl={r.avatar_url} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {r.name || "(名前未設定)"}
                    {r.is_me && (
                      <span className="ml-1.5 text-xs font-normal text-accent-dark">
                        (あなた)
                      </span>
                    )}
                  </p>
                  {r.company && (
                    <p className="truncate text-xs text-gray-500">{r.company}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`badge ${tierStyle}`}>{r.capital_tier}</span>
                  <span className="font-mono text-sm font-bold text-primary">
                    {r.capital_score}pt
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
