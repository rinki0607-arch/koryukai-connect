"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toggleSave, toggleGeneralLike } from "@/app/members/actions";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
      <path
        d="M12 3.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
      <path
        d="M12 20.2s-7.2-4.6-9.6-9.3C.9 7.6 2.4 4 6 4c2 0 3.4 1 4.9 2.7C12.4 5 13.8 4 15.8 4c3.6 0 5.1 3.6 3.6 6.9-2.4 4.7-9.6 9.3-9.6 9.3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MemberActions({
  participantId,
  isSaved,
  alreadyLiked,
  isMatched,
}: {
  participantId: string;
  isSaved: boolean;
  alreadyLiked: boolean;
  isMatched: boolean;
}) {
  const [savePending, startSaveTransition] = useTransition();
  const [likePending, startLikeTransition] = useTransition();

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
      <button
        type="button"
        disabled={savePending}
        aria-label={isSaved ? "保存を解除" : "プロフィールを保存"}
        onClick={() =>
          startSaveTransition(async () => {
            try {
              await toggleSave(participantId, !isSaved);
            } catch (err) {
              alert(err instanceof Error ? err.message : "エラーが発生しました");
            }
          })
        }
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-90 disabled:opacity-40 ${
          isSaved
            ? "bg-accent text-[#241a03] shadow-[0_4px_14px_rgba(201,162,75,0.35)]"
            : "border-[1.5px] border-gray-200 text-gray-400 hover:border-accent hover:text-accent-dark"
        }`}
      >
        <StarIcon filled={isSaved} />
      </button>

      {isMatched ? (
        <Link
          href={`/mypage/matches/${participantId}`}
          className="btn-primary flex-1 text-center text-sm"
        >
          💬 メッセージする
        </Link>
      ) : (
        <button
          type="button"
          disabled={likePending}
          onClick={() =>
            startLikeTransition(async () => {
              try {
                await toggleGeneralLike(participantId, !alreadyLiked);
              } catch (err) {
                alert(err instanceof Error ? err.message : "エラーが発生しました");
              }
            })
          }
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-40 ${
            alreadyLiked
              ? "bg-primary text-white shadow-[0_4px_14px_rgba(214,48,74,0.35)]"
              : "border-[1.5px] border-gray-200 text-gray-500 hover:border-primary hover:text-primary-dark"
          }`}
        >
          <HeartIcon filled={alreadyLiked} />
          {alreadyLiked ? "話してみたい 送信済み" : "話してみたい"}
        </button>
      )}
    </div>
  );
}
