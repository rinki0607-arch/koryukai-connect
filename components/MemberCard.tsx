"use client";

import Link from "next/link";
import { DirectoryEntry } from "@/lib/types";
import { memberCategoryEmoji, memberCategoryLabel } from "@/lib/constants";
import MemberActions from "@/components/MemberActions";

const COVER_GRADIENTS = [
  "from-primary to-[#1c2947]",
  "from-accent-dark to-accent",
  "from-[#2b3a63] to-primary",
  "from-accent to-[#e8c988]",
  "from-[#10192f] to-[#3a4a78]",
];

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

export default function MemberCard({ entry: e }: { entry: DirectoryEntry }) {
  const key = e.name || e.participant_id;
  const gradient = COVER_GRADIENTS[hashName(key) % COVER_GRADIENTS.length];
  const initial = (e.name || "?").trim().charAt(0) || "?";
  const isInvestorOrMentor =
    e.member_category === "investor" || e.member_category === "mentor";

  return (
    <div className="card overflow-hidden !p-0">
      <Link href={`/members/${e.participant_id}`} className="block">
        <div className="relative h-36 w-full overflow-hidden">
          {e.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={e.avatar_url}
              alt={e.name || "プロフィール画像"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}
            >
              <span className="font-display text-5xl font-bold text-white/90">
                {initial}
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 top-0 flex justify-end gap-1.5 p-2.5">
            {isInvestorOrMentor && (
              <span className="badge bg-accent text-[#241a03] shadow-sm">
                {memberCategoryEmoji(e.member_category)} {memberCategoryLabel(e.member_category)}
              </span>
            )}
            {e.events_attended > 0 && (
              <span className="badge bg-white/90 text-primary shadow-sm backdrop-blur-sm">
                参加{e.events_attended}回
              </span>
            )}
            {e.is_matched && (
              <span className="badge bg-green-500 text-white shadow-sm">
                マッチ済み
              </span>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 pb-3 pt-10">
            <p className="truncate font-display text-lg font-bold text-white">
              {e.name || "(名前未設定)"}
            </p>
            {(e.job_title || e.company) && (
              <p className="truncate text-xs text-white/85">
                {[e.job_title, e.company].filter(Boolean).join(" / ")}
              </p>
            )}
          </div>
        </div>
      </Link>

      <div className="p-4">
        {(e.job_type || e.industry) && (
          <p className="text-sm font-semibold text-accent-dark">
            {[e.job_type, e.industry].filter(Boolean).join(" ・ ")}
          </p>
        )}

        {e.investor_mentor_note && (
          <p className="mt-2 line-clamp-2 text-sm text-gray-600">
            {e.investor_mentor_note}
          </p>
        )}

        {e.connect_with_tags && e.connect_with_tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {e.connect_with_tags.map((tag) => (
              <span
                key={tag}
                className="badge border border-accent/30 bg-accent-light/60 text-accent-dark"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {e.connect_with && (
          <p className="mt-2 text-sm text-gray-600">
            繋がりたい人: {e.connect_with}
          </p>
        )}

        {e.bio && (
          <p className="mt-3 line-clamp-3 whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            {e.bio}
          </p>
        )}

        <MemberActions
          participantId={e.participant_id}
          isSaved={e.is_saved}
          alreadyLiked={e.already_liked}
          isMatched={e.is_matched}
        />
      </div>
    </div>
  );
}
