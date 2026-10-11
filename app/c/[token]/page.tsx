import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Profile, PublicCard } from "@/lib/types";
import { memberCategoryEmoji, memberCategoryLabel } from "@/lib/constants";
import Avatar from "@/components/Avatar";
import SaveCardButton from "@/components/SaveCardButton";

export const dynamic = "force-dynamic";

export default async function PublicCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_public_card", { p_token: token })
    .maybeSingle();

  const card = !error ? (data as PublicCard | null) : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOwnCard = false;
  if (user) {
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("card_token")
      .eq("id", user.id)
      .maybeSingle();
    isOwnCard = (myProfile as Pick<Profile, "card_token"> | null)?.card_token === token;
  }

  if (!card) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <div className="card">
          <p className="text-lg font-bold">名刺が見つかりませんでした</p>
          <p className="mt-2 text-sm text-gray-500">
            QRコードまたはリンクが無効です。発行し直してもらうか、再度お試しください。
          </p>
          <Link href="/" className="btn-secondary mt-4 inline-block">
            ARKIVEトップへ
          </Link>
        </div>
      </div>
    );
  }

  const isInvestorOrMentor =
    card.member_category === "investor" || card.member_category === "mentor";

  return (
    <div className="mx-auto max-w-sm">
      <div className="card overflow-hidden !p-0">
        <div className="bg-primary px-6 pb-8 pt-10 text-center">
          <Avatar name={card.name} avatarUrl={card.avatar_url} size={88} />
          <p className="mt-4 font-display text-xl font-bold text-white">
            {card.name || "(名前未設定)"}
          </p>
          {(card.job_title || card.company) && (
            <p className="mt-1 text-sm text-white/80">
              {[card.job_title, card.company].filter(Boolean).join(" / ")}
            </p>
          )}
          {isInvestorOrMentor && (
            <span className="badge mt-3 inline-flex bg-accent text-[#241a03]">
              {memberCategoryEmoji(card.member_category)} {memberCategoryLabel(card.member_category)}
            </span>
          )}
        </div>

        <div className="space-y-4 p-6">
          {(card.job_type || card.industry) && (
            <p className="text-sm font-semibold text-accent-dark">
              {[card.job_type, card.industry].filter(Boolean).join(" ・ ")}
            </p>
          )}

          {card.investor_mentor_note && (
            <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              {card.investor_mentor_note}
            </p>
          )}

          {card.bio && (
            <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              {card.bio}
            </p>
          )}

          <div className="space-y-1.5 text-sm">
            {card.phone && (
              <a href={`tel:${card.phone}`} className="flex items-center gap-2 text-primary">
                📞 {card.phone}
              </a>
            )}
            {card.email && (
              <a href={`mailto:${card.email}`} className="flex items-center gap-2 text-primary">
                ✉️ {card.email}
              </a>
            )}
          </div>

          <a href={`/c/${token}/vcard`} className="btn-secondary w-full">
            ⬇️ 連絡先として保存(vCard)
          </a>

          {user && !isOwnCard && <SaveCardButton token={token} />}

          {isOwnCard && (
            <p className="rounded-xl bg-primary-light/60 p-3 text-center text-sm text-primary">
              これはあなたの名刺ページです。他の人に共有してみましょう。
            </p>
          )}

          {!user && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-600">
                ARKIVEに登録すると、プロフィールを保存してメッセージのやりとりができます。
              </p>
              <Link
                href={`/login?mode=signup&next=/c/${token}`}
                className="btn-primary mt-3 inline-block"
              >
                ARKIVEに登録する
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
