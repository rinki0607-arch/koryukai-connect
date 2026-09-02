"use client";

import { useState, useTransition } from "react";
import { notifyEventParticipants } from "@/app/admin/events/actions";

export default function NotifyButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (
              !window.confirm(
                "登録済みの全参加者にメールで新着通知を送信します。よろしいですか?"
              )
            ) {
              return;
            }
            const result = await notifyEventParticipants(eventId);
            setMessage(result.message);
          })
        }
        className="btn-secondary"
      >
        {pending ? "送信中..." : "参加者へメールで通知する"}
      </button>
      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>
  );
}
