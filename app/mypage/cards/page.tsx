import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BusinessCard } from "@/lib/types";
import CardScanner from "@/components/CardScanner";
import CardList from "@/components/CardList";

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

      <CardList cards={cards} />
    </div>
  );
}
