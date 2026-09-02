"use client";

import { useTransition } from "react";
import { likeParticipant, unlikeParticipant } from "@/app/mypage/matching/[eventId]/actions";
import { AttendeeCandidate } from "@/lib/types";

export default function AttendeeCard({
  eventId,
  attendee,
}: {
  eventId: string;
  attendee: AttendeeCandidate;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="card flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold">
          {attendee.name || "(名前未設定)"}
          {attendee.company ? `(${attendee.company})` : ""}
        </p>
        {attendee.industry && (
          <p className="mt-1 text-sm text-gray-600">
            業種: {attendee.industry}
          </p>
        )}
        {attendee.connect_with && (
          <p className="mt-1 text-sm text-gray-600">
            繋がりたい人: {attendee.connect_with}
          </p>
        )}
      </div>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (attendee.already_liked) {
              await unlikeParticipant(eventId, attendee.participant_id);
            } else {
              await likeParticipant(eventId, attendee.participant_id);
            }
          })
        }
        className={
          attendee.already_liked ? "btn-secondary shrink-0" : "btn-primary shrink-0"
        }
      >
        {attendee.already_liked ? "取り消す" : "話してみたい"}
      </button>
    </div>
  );
}
