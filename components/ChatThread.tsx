"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Message } from "@/lib/types";
import { sendMessage, markConversationRead } from "@/app/mypage/matches/[partnerId]/actions";

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

export default function ChatThread({
  currentUserId,
  partnerId,
  initialMessages,
}: {
  currentUserId: string;
  partnerId: string;
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">
            まだメッセージはありません。最初のメッセージを送ってみましょう。
          </p>
        )}
        {messages.map((m) => {
          const day = formatDayLabel(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          const isMine = m.sender_id === currentUserId;
          return (
            <div key={m.id}>
              {showDay && (
                <p className="my-3 text-center text-xs text-gray-400">{day}</p>
              )}
              <div
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                    isMine
                      ? "bg-primary text-white"
                      : "border border-gray-200 bg-white text-gray-800"
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

      <div className="mt-3 flex items-end gap-2 border-t border-gray-200 pt-3">
        <textarea
          className="input min-h-[44px] resize-none"
          rows={1}
          placeholder="メッセージを入力(Enterで送信・Shift+Enterで改行)"
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
          className="btn-primary shrink-0"
          disabled={pending || !draft.trim()}
          onClick={handleSend}
        >
          送信
        </button>
      </div>
    </div>
  );
}
