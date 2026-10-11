"use client";

import { useEffect, useState } from "react";
import AttendeeCard from "@/components/AttendeeCard";
import { AttendeeCandidate, AttendeeRecommendation } from "@/lib/types";

export default function AttendeeList({
  eventId,
  attendees,
}: {
  eventId: string;
  attendees: AttendeeCandidate[];
}) {
  const [recommendations, setRecommendations] = useState<AttendeeRecommendation[] | null>(
    null
  );
  const [recoLoading, setRecoLoading] = useState(true);
  const [recoError, setRecoError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"all" | "investor_mentor">("all");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setRecoLoading(true);
      setRecoError(null);
      try {
        const res = await fetch("/api/recommend-attendees", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ eventId }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && Array.isArray(data?.recommendations)) {
          setRecommendations(data.recommendations);
        } else if (res.status !== 503) {
          setRecoError(data?.error || null);
        }
      } catch {
        if (!cancelled) setRecoError(null); // AIが使えない環境では静かに非表示にする
      } finally {
        if (!cancelled) setRecoLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const byId = new Map(attendees.map((a) => [a.participant_id, a]));
  const recommendedAttendees = (recommendations || [])
    .map((r) => {
      const a = byId.get(r.participant_id);
      return a ? { attendee: a, reason: r.reason } : null;
    })
    .filter((v): v is { attendee: AttendeeCandidate; reason: string } => !!v);

  const hasInvestorOrMentor = attendees.some(
    (a) => a.member_category === "investor" || a.member_category === "mentor"
  );

  const filteredAttendees =
    categoryFilter === "investor_mentor"
      ? attendees.filter(
          (a) => a.member_category === "investor" || a.member_category === "mentor"
        )
      : attendees;

  return (
    <div>
      {recoLoading && (
        <p className="mb-4 text-xs text-gray-400">🤖 AIがおすすめの3名を選んでいます…</p>
      )}

      {!recoLoading && recommendedAttendees.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-sm font-semibold text-gray-700">
            🤖 AIが選ぶ、今日会うべき3名
          </p>
          <div className="space-y-3">
            {recommendedAttendees.map(({ attendee, reason }) => (
              <AttendeeCard
                key={`ai-${attendee.participant_id}`}
                eventId={eventId}
                attendee={attendee}
                aiReason={reason}
              />
            ))}
          </div>
        </div>
      )}

      {recoError && (
        <p className="mb-4 text-xs text-gray-400">{recoError}</p>
      )}

      {hasInvestorOrMentor && (
        <div className="segment mb-4 max-w-[280px]">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`segment-option ${categoryFilter === "all" ? "is-active" : ""}`}
          >
            すべて表示
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("investor_mentor")}
            className={`segment-option ${categoryFilter === "investor_mentor" ? "is-active" : ""}`}
          >
            💰🎓 投資家・メンターのみ
          </button>
        </div>
      )}

      {recommendedAttendees.length > 0 && (
        <p className="mb-3 text-sm font-semibold text-gray-700">参加者一覧</p>
      )}

      {filteredAttendees.length === 0 ? (
        <p className="text-sm text-gray-500">該当する参加者がいません。</p>
      ) : (
        <div className="space-y-3">
          {filteredAttendees.map((a) => (
            <AttendeeCard key={a.participant_id} eventId={eventId} attendee={a} />
          ))}
        </div>
      )}
    </div>
  );
}
