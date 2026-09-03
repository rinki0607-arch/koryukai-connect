"use client";

import { useTransition } from "react";
import { likeParticipant, unlikeParticipant } from "@/app/mypage/matching/[eventId]/actions";
import { AttendeeCandidate } from "@/lib/types";
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
}: {
  eventId: string;
  attendee: AttendeeCandidate;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="card flex items-center gap-3">
      <Avatar name={attendee.name} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {attendee.name || "(名前未設定)"}
          {attendee.company ? `(${attendee.company})` : ""}
        </p>
        {attendee.industry && (
          <p className="mt-1 truncate text-sm text-gray-600">
            業種: {attendee.industry}
          </p>
        )}
        {attendee.connect_with && (
          <p className="mt-1 truncate text-sm text-gray-600">
            繋がりたい人: {attendee.connect_with}
          </p>
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
            ? "bg-accent text-[#241a03] shadow-[0_4px_14px_rgba(201,162,75,0.35)]"
            : "border-[1.5px] border-gray-200 text-gray-400 hover:border-accent hover:text-accent-dark"
        }`}
      >
        <HeartIcon filled={!!attendee.already_liked} />
      </button>
    </div>
  );
}
