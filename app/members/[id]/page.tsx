import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DirectoryEntry } from "@/lib/types";
import Avatar from "@/components/Avatar";
import MemberActions from "@/components/MemberActions";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/members/${id}`);
  if (user.id === id) redirect("/mypage");

  const { data, error } = await supabase.rpc("get_member_profile", {
    p_id: id,
  });

  if (error) {
    return (
      <div>
        <Link
          href="/members"
          className="text-sm text-gray-500 hover:text-primary"
        >
          ← 名簿に戻る
        </Link>
        <p className="card mt-4 text-sm text-red-600">
          プロフィールの読み込みに失敗しました。しばらくしてから再度お試しください。
        </p>
      </div>
    );
  }

  const entries = (data as DirectoryEntry[]) || [];
  const e = entries[0];
  if (!e) notFound();

  return (
    <div>
      <Link
        href="/members"
        className="mb-4 inline-block text-sm text-gray-500 hover:text-primary"
      >
        ← 名簿に戻る
      </Link>

      <div className="card">
        <div className="flex items-start gap-4">
          <Avatar name={e.name} avatarUrl={e.avatar_url} size={64} />
          <div className="flex-1">
            <h1 className="text-lg font-bold">{e.name || "(名前未設定)"}</h1>
            {(e.job_title || e.company) && (
              <p className="mt-0.5 text-sm text-gray-500">
                {[e.job_title, e.company].filter(Boolean).join(" / ")}
              </p>
            )}
          </div>
          {e.events_attended > 0 && (
            <span className="badge shrink-0 bg-primary-light text-primary">
              参加{e.events_attended}回
            </span>
          )}
        </div>

        {(e.job_type || e.industry) && (
          <p className="mt-3 text-sm text-gray-600">
            {[e.job_type, e.industry].filter(Boolean).join(" ・ ")}
          </p>
        )}

        {(e.connect_with_tags && e.connect_with_tags.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1">
            {e.connect_with_tags.map((tag) => (
              <span key={tag} className="badge bg-gray-100 text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        )}

        {e.connect_with && (
          <p className="mt-3 text-sm text-gray-600">
            繋がりたい人: {e.connect_with}
          </p>
        )}

        {e.bio && (
          <p className="mt-4 whitespace-pre-wrap border-t border-gray-100 pt-4 text-sm text-gray-700">
            {e.bio}
          </p>
        )}

        {e.is_matched && (
          <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            🎉 マッチしています。メッセージでやりとりができます。
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
