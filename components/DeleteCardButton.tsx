"use client";

import { useTransition } from "react";
import { deleteBusinessCard } from "@/app/mypage/cards/actions";

export default function DeleteCardButton({ cardId }: { cardId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!window.confirm("この名刺を削除しますか?元に戻せません。")) return;
        startTransition(() => deleteBusinessCard(cardId));
      }}
      className="shrink-0 text-xs text-gray-400 hover:text-red-500 disabled:opacity-40"
    >
      削除
    </button>
  );
}
