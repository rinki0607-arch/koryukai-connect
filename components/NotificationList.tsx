"use client";

import { useTransition } from "react";
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

export default function NotificationList({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  const [pending, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <div>
      {unread > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => markAllRead())}
            className="text-sm font-semibold text-primary hover:underline disabled:opacity-40"
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
            const card = (
              <div
                className={`card ${
                  !n.read_at ? "border-accent/40 bg-accent/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{n.title}</p>
                  {!n.read_at && (
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
            );

            if (n.link) {
              return (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => {
                    if (!n.read_at) startTransition(() => markRead(n.id));
                  }}
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
