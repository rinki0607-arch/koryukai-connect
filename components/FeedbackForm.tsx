"use client";

import { useState } from "react";
import { submitEventFeedback } from "@/app/mypage/feedback/[eventId]/actions";

const RECOMMEND_OPTIONS: { value: "yes" | "neutral" | "no"; label: string }[] = [
  { value: "yes", label: "また参加したい" },
  { value: "neutral", label: "どちらとも言えない" },
  { value: "no", label: "あまり参加したくない" },
];

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
      <path
        d="M12 2.5l2.9 6.16 6.6.72-4.9 4.6 1.28 6.62L12 17.5l-5.88 3.1 1.28-6.62-4.9-4.6 6.6-.72L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FeedbackForm({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [recommend, setRecommend] = useState<"yes" | "neutral" | "no" | "">("");

  const canSubmit = rating > 0 && recommend !== "";

  return (
    <form action={submitEventFeedback} className="card max-w-xl space-y-6">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="rating" value={rating} />
      <input type="hidden" name="would_recommend" value={recommend} />

      <div>
        <p className="text-sm text-gray-500">{eventTitle}</p>
        <h2 className="mt-1 font-semibold">今日の交流会はいかがでしたか?</h2>
      </div>

      <div>
        <p className="label">満足度</p>
        <div
          className="flex gap-1.5 text-gray-200"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              aria-label={`${n}点`}
              className={`transition-all duration-150 active:scale-90 ${
                n <= (hoverRating || rating) ? "text-accent" : "text-gray-200"
              }`}
            >
              <StarIcon filled={n <= (hoverRating || rating)} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">また交流会に参加したいと思いますか?</p>
        <div className="flex flex-wrap gap-2">
          {RECOMMEND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRecommend(opt.value)}
              className={`chip ${recommend === opt.value ? "is-active" : ""}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">ご感想・ご意見(任意)</label>
        <textarea
          name="comment"
          className="input"
          rows={4}
          placeholder="良かった点や改善してほしい点など、自由にご記入ください。"
        />
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary-light p-3">
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" name="wants_interview" className="mt-0.5" />
          <span>
            <span className="font-semibold">アーク起業アカデミーの個別相談(面談)を希望する</span>
            <span className="mt-0.5 block text-xs text-gray-500">
              今日の話の続きを、運営スタッフと1対1で相談できます。後日ご連絡します。
            </span>
          </span>
        </label>
      </div>

      <button type="submit" disabled={!canSubmit} className="btn-primary w-full disabled:opacity-40">
        アンケートを送信する
      </button>
    </form>
  );
}
