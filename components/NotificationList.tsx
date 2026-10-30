"use client";

import { ReactNode, useState, useTransition } from "react";
import Link from "next/link";
import { markRead, markAllRead } from "@/app/notifications/actions";

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 20.2s-7.2-4.6-9.6-9.3C.9 7.6 2.4 4 6 4c2 0 3.4 1 4.9 2.7C12.4 5 13.8 4 15.8 4c3.6 0 5.1 3.6 3.6 6.9-2.4 4.7-9.6 9.3-9.6 9.3Z" />
    </svg>
  );
}

function MatchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="m9 15 1.6 1.6L15 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M7 14.5h4M7 10.5h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 10.5a6 6 0 1 1 12 0c0 2.2.6 3.6 1.4 4.8.5.7 0 1.7-.9 1.7H5.5c-.9 0-1.4-1-.9-1.7.8-1.2 1.4-2.6 1.4-4.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9.5 19.5a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

// 通知の種類ごとに、フィード・参加者名簿のカードと同じ「アイコン(丸)+本文」の
// 並びに揃える。色分けすることで一覧をざっと流し見したときに種類が分かるようにする。
const TYPE_STYLES: Record<string, { icon: ReactNode; className: string }> = {
  post_like: { icon: <HeartIcon />, className: "bg-primary-light text-primary" },
  match: { icon: <MatchIcon />, className: "bg-green-100 text-green-700" },
  event: { icon: <CalendarIcon />, className: "bg-accent-light text-accent-dark" },
  business_card: { icon: <CardIcon />, className: "bg-gray-100 text-gray-600" },
};

function NotificationIcon({ type }: { type: string }) {
  const style = TYPE_STYLES[type] || { icon: <BellIcon />, className: "bg-gray-100 text-gray-500" };
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.className}`}
      aria-hidden="true"
    >
      {style.icon}
    </span>
  );
}

export default function NotificationList({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  const [, startTransition] = useTransition();
  // 楽観的UI: 既読ボタン・リンクを押した瞬間にバッジを消す(サーバーの応答を待たない)
  const [readIds, setReadIds] = useState<Set<string>>(
    new Set(notifications.filter((n) => n.read_at).map((n) => n.id))
  );

  const isRead = (n: NotificationRow) => !!n.read_at || readIds.has(n.id);
  const unread = notifications.filter((n) => !isRead(n)).length;

  const handleMarkRead = (id: string) => {
    if (readIds.has(id)) return;
    setReadIds((prev) => new Set(prev).add(id));
    startTransition(() => markRead(id));
  };

  const handleMarkAllRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
    startTransition(() => markAllRead());
  };

  return (
    <div>
      {unread > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-sm font-semibold text-primary hover:underline"
          >
            すべて既読にする
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <p className="text-sm text-gray-500">お知らせはまだありません。</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const read = isRead(n);
            const card = (
              <div
                className={`card flex items-start gap-3 ${
                  !read ? "border-accent/40 bg-accent/5" : ""
                }`}
              >
                <NotificationIcon type={n.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{n.title}</p>
                    {!read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    )}
                  </div>
                  {n.body && (
                    <p className="mt-1 text-sm text-gray-600">{n.body}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    {formatDateTime(n.created_at)}
                  </p>
                </div>
              </div>
            );

            if (n.link) {
              return (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => handleMarkRead(n.id)}
                  className="block"
                >
                  {card}
                </Link>
              );
            }
            return <div key={n.id}>{card}</div>;
          })}
        </div>
      )}
    </div>
  );
}
