import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MatchRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/matches");

  const { data, error } = await supabase.rpc("get_my_matches");
  const matches = (data as MatchRow[]) || [];

  return (
    <div>
      <h1 className="mb-2 text-xl font-bold">マッチ一覧</h1>
      <p className="mb-6 text-sm text-gray-500">
        お互いに「話してみたい」を選んだ相手だけが表示されます。
      </p>

      {error && (
        <p className="text-sm text-red-600">読み込みに失敗しました: {error.message}</p>
      )}

      {matches.length === 0 ? (
        <p className="text-sm text-gray-500">まだマッチはありません。</p>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <div key={`${m.event_id}-${m.participant_id}`} className="card">
              <p className="text-xs text-gray-500">{m.event_title}</p>
              <p className="mt-1 font-semibold">
                {m.name || "(名前未設定)"}
                {m.company ? `(${m.company})` : ""}
              </p>
              {m.industry && (
                <p className="mt-1 text-sm text-gray-600">業種: {m.industry}</p>
              )}
              {m.connect_with && (
                <p className="mt-1 text-sm text-gray-600">
                  繋がりたい人: {m.connect_with}
                </p>
              )}
              {m.email && (
                <p className="mt-2 text-sm text-primary">連絡先: {m.email}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
