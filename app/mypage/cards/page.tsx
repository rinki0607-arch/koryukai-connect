import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BusinessCard } from "@/lib/types";
import Avatar from "@/components/Avatar";
import CardScanner from "@/components/CardScanner";
import DeleteCardButton from "@/components/DeleteCardButton";

export const dynamic = "force-dynamic";

export default async function MyCardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/cards");

  const { data } = await supabase
    .from("business_cards")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const cards = (data as BusinessCard[]) || [];

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">マイ名刺</h1>
      <p className="mb-6 text-sm text-gray-500">
        交流会で交換した名刺をスキャンして、人脈リストとして蓄積できます。
      </p>

      <CardScanner />

      <h2 className="mb-3 font-semibold">保存済みの名刺({cards.length}件)</h2>
      {cards.length === 0 ? (
        <p className="text-sm text-gray-500">まだ名刺が登録されていません。</p>
      ) : (
        <div className="space-y-3">
          {cards.map((c) => (
            <div key={c.id} className="card flex items-start gap-3">
              <Avatar name={c.name} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {c.name || "(氏名未設定)"}
                  {c.company ? `(${c.company})` : ""}
                </p>
                {c.job_title && (
                  <p className="mt-0.5 text-sm text-gray-500">{c.job_title}</p>
                )}
                <div className="mt-1 space-y-0.5 text-sm text-gray-600">
                  {c.phone && <p>📞 {c.phone}</p>}
                  {c.email && <p>✉️ {c.email}</p>}
                </div>
                {c.note && (
                  <p className="mt-1.5 whitespace-pre-wrap text-xs text-gray-400">
                    {c.note}
                  </p>
                )}
              </div>
              <DeleteCardButton cardId={c.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
