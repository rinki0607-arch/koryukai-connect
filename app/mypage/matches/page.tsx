import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationRow } from "@/lib/types";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

function formatShort(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/matches");

  const { data, error } = await supabase.rpc("get_my_conversations");
  const conversations = (data as ConversationRow[]) || [];
  const newMatches = conversations.filter((c) => !c.last_message);
  const started = conversations.filter((c) => c.last_message);

  return (
    <div>
      <h1 className="mb-2 text-xl font-bold">メッセージ</h1>
      <p className="mb-6 text-sm text-gray-500">
        お互いに「話してみたい」を選んだ相手とチャットできます。会話は相手ごとに、今後別の交流会で再びマッチしても続けて残ります。
      </p>

      {error && (
        <p className="text-sm text-red-600">読み込みに失敗しました: {error.message}</p>
      )}

      {conversations.length === 0 && !error && (
        <p className="text-sm text-gray-500">
          まだマッチはありません。交流会のマッチングページから「話してみたい」を選ぶと、ここに表示されます。
        </p>
      )}

      {newMatches.length > 0 && (
        <div className="mb-7">
          <p className="mb-3 text-sm font-semibold text-gray-500">
            新しいマッチ
          </p>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
            {newMatches.map((c) => (
              <Link
                key={c.partner_id}
                href={`/mypage/matches/${c.partner_id}`}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5 active:scale-95"
              >
                <div className="relative">
                  <div className="rounded-full ring-2 ring-accent ring-offset-2 ring-offset-white">
                    <Avatar name={c.name} avatarUrl={c.avatar_url} size={56} />
                  </div>
                  <span className="absolute -right-1 -top-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-[#241a03] shadow-sm">
                    NEW
                  </span>
                </div>
                <p className="w-full truncate text-center text-[11px] text-gray-600">
                  {c.name || "匿名"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {started.length > 0 && (
        <div>
          {newMatches.length > 0 && (
            <p className="mb-3 text-sm font-semibold text-gray-500">
              メッセージ
            </p>
          )}
          <div className="space-y-2">
            {started.map((c) => (
              <Link
                key={c.partner_id}
                href={`/mypage/matches/${c.partner_id}`}
                className="card-tap flex items-center justify-between gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={c.name} avatarUrl={c.avatar_url} size={52} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {c.name || "(名前未設定)"}
                      {c.company ? `(${c.company})` : ""}
                    </p>
                    <p
                      className={`mt-0.5 truncate text-sm ${
                        c.unread_count > 0
                          ? "font-semibold text-gray-800"
                          : "text-gray-500"
                      }`}
                    >
                      {c.last_sender_id === user.id ? "あなた: " : ""}
                      {c.last_message}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {(c.last_message_at || c.first_matched_at) && (
                    <span className="text-xs text-gray-400">
                      {formatShort(c.last_message_at || c.first_matched_at)}
                    </span>
                  )}
                  {c.unread_count > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-[#1b1305]">
                      {c.unread_count > 9 ? "9+" : c.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
