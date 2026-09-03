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

  return (
    <div>
      <h1 className="mb-2 text-xl font-bold">メッセージ</h1>
      <p className="mb-6 text-sm text-gray-500">
        お互いに「話してみたい」を選んだ相手とチャットできます。会話は相手ごとに、今後別の交流会で再びマッチしても続けて残ります。
      </p>

      {error && (
        <p className="text-sm text-red-600">読み込みに失敗しました: {error.message}</p>
      )}

      {conversations.length === 0 ? (
        <p className="text-sm text-gray-500">
          まだマッチはありません。交流会のマッチングページから「話してみたい」を選ぶと、ここに表示されます。
        </p>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.partner_id}
              href={`/mypage/matches/${c.partner_id}`}
              className="card-tap flex items-center justify-between gap-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={c.name} size={44} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {c.name || "(名前未設定)"}
                    {c.company ? `(${c.company})` : ""}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-gray-500">
                    {c.last_message
                      ? `${c.last_sender_id === user.id ? "あなた: " : ""}${c.last_message}`
                      : "まだメッセージはありません"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {(c.last_message_at || c.first_matched_at) && (
                  <span className="text-xs text-gray-400">
                    {formatShort(c.last_message_at || c.first_matched_at)}
                  </span>
                )}
                {c.unread_count > 0 && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-[#1b1305]">
                    {c.unread_count}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
