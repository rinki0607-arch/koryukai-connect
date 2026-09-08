"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Message } from "@/lib/types";
import { sendMessage, markConversationRead } from "@/app/mypage/matches/[partnerId]/actions";
import Avatar from "@/components/Avatar";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("ja-JP", {
    year: sameYear ? undefined : "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatMatchedDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ChatThread({
  currentUserId,
  partnerId,
  partnerName,
  partnerAvatarUrl,
  matchedAt,
  initialMessages,
}: {
  currentUserId: string;
  partnerId: string;
  partnerName?: string | null;
  partnerAvatarUrl?: string | null;
  matchedAt?: string | null;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${currentUserId}-${partnerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          const belongsHere =
            (m.sender_id === currentUserId && m.recipient_id === partnerId) ||
            (m.sender_id === partnerId && m.recipient_id === currentUserId);
          if (!belongsHere) return;

          setMessages((prev) =>
            prev.some((p) => p.id === m.id) ? prev : [...prev, m]
          );

          if (m.recipient_id === currentUserId) {
            markConversationRead(partnerId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, partnerId]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content || pending) return;
    setDraft("");
    startTransition(async () => {
      try {
        await sendMessage(partnerId, content);
      } catch {
        setDraft(content);
      }
    });
  };

  let lastDay = "";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-1.5 overflow-y-auto py-3 pr-1">
        {matchedAt && (
          <div className="mb-2 flex flex-col items-center gap-2 py-4 text-center">
            <Avatar name={partnerName} avatarUrl={partnerAvatarUrl} size={56} />
            <p className="text-sm font-semibold">
              {partnerName || "(名前未設定)"}さんとマッチしました
            </p>
            <p className="text-[11px] text-gray-400">
              {formatMatchedDate(matchedAt)}にマッチ成立
            </p>
          </div>
        )}
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">
            まだメッセージはありません。最初のメッセージを送ってみましょう。
          </p>
        )}
        {messages.map((m, i) => {
          const day = formatDayLabel(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          const isMine = m.sender_id === currentUserId;
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const grouped =
            !showDay && !!prev && prev.sender_id === m.sender_id;
          const isLastInGroup =
            !next ||
            next.sender_id !== m.sender_id ||
            formatDayLabel(next.created_at) !== day;
          return (
            <div key={m.id}>
              {showDay && (
                <p className="my-4 text-center text-[11px] font-semibold text-gray-400">
                  {day}
                </p>
              )}
              <div
                className={`flex items-end gap-2 ${
                  isMine ? "justify-end" : "justify-start"
                } ${grouped ? "mt-0.5" : "mt-2.5"}`}
              >
                {!isMine && (
                  <div className="h-6 w-6 shrink-0">
                    {isLastInGroup && (
                      <Avatar name={partnerName} avatarUrl={partnerAvatarUrl} size={24} />
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-4 py-2.5 text-[14px] leading-relaxed shadow-[0_1px_4px_rgba(16,25,47,0.06)] ${
                    isMine
                      ? "rounded-[18px] rounded-br-[4px] bg-primary text-white"
                      : "rounded-[18px] rounded-bl-[4px] border border-gray-100 bg-white text-gray-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      isMine ? "text-white/60" : "text-gray-400"
                    }`}
                  >
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-gray-100 bg-white pb-2 pt-3">
        <textarea
          className="input min-h-[44px] flex-1 resize-none rounded-3xl"
          rows={1}
          placeholder="メッセージを入力"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          aria-label="送信"
          disabled={pending || !draft.trim()}
          onClick={handleSend}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-[#241a03] shadow-[0_4px_14px_rgba(201,162,75,0.35)] transition-all duration-150 active:scale-90 disabled:pointer-events-none disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12h15M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
