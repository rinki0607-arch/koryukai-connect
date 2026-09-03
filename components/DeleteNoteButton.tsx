"use client";

import { useTransition } from "react";
import { deleteAdminNote } from "@/app/admin/participants/actions";

export default function DeleteNoteButton({
  noteId,
  participantId,
}: {
  noteId: string;
  participantId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!window.confirm("このメモを削除しますか?元に戻せません。")) return;
        startTransition(() => deleteAdminNote(noteId, participantId));
      }}
      className="shrink-0 text-xs text-gray-400 hover:text-red-500 disabled:opacity-40"
    >
      削除
    </button>
  );
}
