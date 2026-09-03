import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationPartner, Message } from "@/lib/types";
import ChatThread from "@/components/ChatThread";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/mypage/matches/${partnerId}`);

  const { data: partnerRows } = await supabase.rpc("get_conversation_partner", {
    partner: partnerId,
  });
  const partner = (partnerRows as ConversationPartner[] | null)?.[0];

  if (!partner) {
    return (
      <div>
        <p className="card text-sm text-red-600">
          この相手とはマッチしていないため、メッセージを送れません。
        </p>
        <Link
          href="/mypage/matches"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          &larr; メッセージ一覧へ戻る
        </Link>
      </div>
    );
  }

  const { data: messagesData } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true });

  await supabase.rpc("mark_conversation_read", { partner: partnerId });

  return (
    <div className="-mx-4 flex h-[calc(100vh-140px)] min-h-[480px] flex-col sm:mx-0">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-4 pb-4 pt-1 backdrop-blur sm:rounded-t-[20px] sm:px-1">
        <Link
          href="/mypage/matches"
          aria-label="メッセージ一覧へ戻る"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-gray-400 transition active:scale-90 hover:bg-gray-100 hover:text-primary"
        >
          &larr;
        </Link>
        <Avatar name={partner.name} size={40} />
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {partner.name || "(名前未設定)"}
            {partner.company ? `(${partner.company})` : ""}
          </p>
          {(partner.job_title || partner.industry) && (
            <p className="truncate text-xs text-gray-500">
              {[partner.job_title, partner.industry].filter(Boolean).join(" / ")}
            </p>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 px-4 sm:px-1">
        <ChatThread
          currentUserId={user.id}
          partnerId={partnerId}
          partnerName={partner.name}
          matchedAt={partner.matched_at}
          initialMessages={(messagesData as Message[]) || []}
        />
      </div>
    </div>
  );
}
