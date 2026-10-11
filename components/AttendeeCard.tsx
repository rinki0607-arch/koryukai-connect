"use client";

import { useTransition } from "react";
import { likeParticipant, unlikeParticipant } from "@/app/mypage/matching/[eventId]/actions";
import { AttendeeCandidate } from "@/lib/types";
import { memberCategoryEmoji, memberCategoryLabel } from "@/lib/constants";
import Avatar from "@/components/Avatar";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
      <path
        d="M12 20.2s-7.2-4.6-9.6-9.3C.9 7.6 2.4 4 6 4c2 0 3.4 1 4.9 2.7C12.4 5 13.8 4 15.8 4c3.6 0 5.1 3.6 3.6 6.9-2.4 4.7-9.6 9.3-9.6 9.3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AttendeeCard({
  eventId,
  attendee,
  aiReason,
}: {
  eventId: string;
  attendee: AttendeeCandidate;
  aiReason?: string;
}) {
  const [pending, startTransition] = useTransition();

  const shared = attendee.shared_tags || [];
  const isRecommended = (attendee.match_score || 0) >= 15;
  const isInvestorOrMentor =
    attendee.member_category === "investor" || attendee.member_category === "mentor";

  return (
    <div className="card relative flex items-center gap-3 overflow-hidden">
      {!aiReason && isRecommended && (
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent-dark">
          ✨ おすすめ
        </span>
      )}
      <Avatar name={attendee.name} avatarUrl={attendee.avatar_url} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 pr-16">
          <p className="truncate font-semibold">
            {attendee.name || "(名前未設定)"}
            {attendee.company ? `(${attendee.company})` : ""}
          </p>
          {isInvestorOrMentor && (
            <span className="badge shrink-0 border border-accent/40 bg-accent/10 text-accent-dark">
              {memberCategoryEmoji(attendee.member_category)} {memberCategoryLabel(attendee.member_category)}
            </span>
          )}
        </div>
        {attendee.industry && (
          <p className="mt-1 truncate text-sm text-gray-600">
            業種: {attendee.industry}
          </p>
        )}
        {attendee.investor_mentor_note && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-600">
            {attendee.investor_mentor_note}
          </p>
        )}
        {attendee.connect_with && (
          <p className="mt-1 truncate text-sm text-gray-600">
            繋がりたい人: {attendee.connect_with}
          </p>
        )}
        {attendee.goal_text && (
          <p className="mt-1 truncate text-sm text-gray-600">
            今日のゴール: {attendee.goal_text}
          </p>
        )}
        {aiReason && (
          <p className="mt-1.5 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary-dark">
            🤖 {aiReason}
          </p>
        )}
        {shared.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {shared.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        disabled={pending}
        aria-label={attendee.already_liked ? "話してみたいを取り消す" : "話してみたい"}
        onClick={() =>
          startTransition(async () => {
            if (attendee.already_liked) {
              await unlikeParticipant(eventId, attendee.participant_id);
            } else {
              await likeParticipant(eventId, attendee.participant_id);
            }
          })
        }
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-90 disabled:opacity-40 ${
          attendee.already_liked
            ? "bg-primary text-white shadow-[0_4px_14px_rgba(214,48,74,0.35)]"
            : "border-[1.5px] border-gray-200 text-gray-400 hover:border-primary hover:text-primary-dark"
        }`}
      >
        <HeartIcon filled={!!attendee.already_liked} />
      </button>
    </div>
  );
}
