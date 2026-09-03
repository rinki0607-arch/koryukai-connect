"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "こんにちは。ARKIVEサポートAIです。アーク起業塾の交流会日程や、参加登録・マイページ・マッチングなどアプリの使い方について24時間お答えします。交流会での通報や運営への問い合わせも、下のボタンまたはメッセージからそのまま受け付けられます。",
};

const QUICK_ACTIONS: { label: string; icon: string; message: string }[] = [
  {
    label: "通報する",
    icon: "🚨",
    message: "交流会で困ったことがあったので、運営に通報したいです。",
  },
  {
    label: "運営に問い合わせる",
    icon: "💬",
    message: "運営担当者に問い合わせたいことがあります。",
  },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, open, pending]);

  const handleSend = async (override?: string) => {
    const content = (override ?? draft).trim();
    if (!content || pending) return;

    const next = [...messages, { role: "user", content } as ChatMessage];
    setMessages(next);
    setDraft("");
    setPending(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.reply || "只今応答できません。少し時間をおいてお試しください。",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "通信エラーが発生しました。少し時間をおいて再度お試しください。",
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="chatbot-fab fixed right-4 z-[45] flex flex-col items-end gap-3 lg:right-6">
      {open && (
        <div className="flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-widest text-accent">
                24H AUTO RESPONSE
              </p>
              <p className="font-display text-base font-bold">ARKIVEサポートAI</p>
            </div>
            <button
              aria-label="閉じる"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                    m.role === "user"
                      ? "bg-primary text-white"
                      : "border border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-gray-200 bg-white px-3 py-2">
                  <TypingDots />
                </div>
              </div>
            )}
            {messages.length <= 1 && !pending && (
              <div className="flex flex-wrap gap-2 pl-0.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.message)}
                    className="flex items-center gap-1.5 rounded-full border-[1.5px] border-gray-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600 transition-all duration-150 active:scale-95 hover:border-primary/30 hover:bg-primary-light/50"
                  >
                    <span>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-200 bg-white p-2.5">
            <div className="flex items-end gap-2">
              <textarea
                className="input min-h-[40px] resize-none text-sm"
                rows={1}
                placeholder="質問を入力(Enterで送信)"
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
                className="btn-primary shrink-0 px-3 py-2 text-sm"
                disabled={pending || !draft.trim()}
                onClick={() => handleSend()}
              >
                送信
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-gray-400">
              AIによる自動応答です。内容の正確性は運営にもご確認ください。
            </p>
          </div>
        </div>
      )}

      <button
        aria-label={open ? "チャットを閉じる" : "ARKIVEサポートAIに質問する"}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-accent shadow-lg transition hover:opacity-90"
      >
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-accent" />
        )}
        {open ? (
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.2-3.6A7.96 7.96 0 0 1 4 12Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <circle cx="8.5" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="15.5" cy="12" r="1" fill="currentColor" />
          </svg>
        )}
      </button>
    </div>
  );
}
