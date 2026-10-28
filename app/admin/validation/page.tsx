import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminValidationIndexPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: false });
  const events = (data as EventRow[]) || [];

  return (
    <div>
      <h1 className="text-xl font-bold">仮説検証</h1>
      <p className="mt-1 text-sm text-gray-500">
        アプリを作り込む前に、5つの仮説が当たっているかを交流会ごとに数字で確かめます。
        合格ラインに届いたものだけを本格的に開発します。
      </p>

      <div className="card mt-4 text-sm text-gray-700">
        <p className="font-semibold">確かめる5つの仮説</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>主催者の一番の困りごとは、受付より「交流会のあと面談・入塾につながらないこと」</li>
          <li>交流会の中身が見えれば、参加者は申込のついでに登録してくれる</li>
          <li>事前に「話すとよい3人」を案内すると、交流会のあとの面談が増える</li>
          <li>紹介元ごとに参加と入塾を区別できれば、報酬と営業の精度が上がる</li>
          <li>QR受付で、当日の受付が大きく楽になる</li>
        </ol>
      </div>

      <h2 className="mb-3 mt-6 font-semibold">交流会を選ぶ</h2>
      {events.length === 0 ? (
        <p className="text-sm text-gray-500">まだ交流会がありません。</p>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/admin/validation/${ev.id}`}
              className="card block hover:border-primary"
            >
              <p className="text-xs text-gray-500">{formatEventDate(ev.event_date)}</p>
              <p className="font-semibold">{ev.title}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
