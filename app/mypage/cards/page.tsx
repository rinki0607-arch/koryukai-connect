import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { BusinessCard, Profile } from "@/lib/types";
import CardQrScanner from "@/components/CardQrScanner";
import CardScanner from "@/components/CardScanner";
import CardList from "@/components/CardList";
import CopyLinkButton from "@/components/CopyLinkButton";

export const dynamic = "force-dynamic";

export default async function MyCardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/cards");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileData as Profile;

  const { data } = await supabase
    .from("business_cards")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const cards = (data as BusinessCard[]) || [];

  const qrValue = `ARKIVE:card:v1:${profile.card_token}`;
  const qrDataUrl = await QRCode.toDataURL(qrValue, {
    margin: 1,
    width: 280,
    color: { dark: "#10192f", light: "#ffffffff" },
  });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://koryukai-connect.vercel.app";
  const publicCardUrl = `${appUrl}/c/${profile.card_token}`;
  const publicQrDataUrl = await QRCode.toDataURL(publicCardUrl, {
    margin: 1,
    width: 280,
    color: { dark: "#10192f", light: "#ffffffff" },
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">マイ名刺</h1>
      <p className="mb-6 text-sm text-gray-500">
        QRコードを見せ合うだけで、お互いのプロフィールを自動で交換できます。紙の名刺を撮影して保存することもできます。
      </p>

      <div className="card mb-4">
        <p className="font-semibold">① 自分のQRコードを見せる</p>
        <p className="mt-1 text-sm text-gray-500">
          この画面を相手に見せて、「② 相手のQRコードを読み取る」でスキャンしてもらってください。
        </p>
        <details className="mt-3">
          <summary className="btn-secondary inline-block cursor-pointer select-none">
            📏 自分のQRコードを表示
          </summary>
          <div className="mt-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="マイ名刺QRコード"
              className="mx-auto h-auto w-full max-w-[220px] rounded-xl border border-gray-100"
            />
            <p className="mt-2 text-sm font-semibold">
              {profile.name || "(名前未設定)"}
              {profile.company ? `(${profile.company})` : ""}
            </p>
          </div>
        </details>
      </div>

      <div className="card mb-6">
        <p className="font-semibold">② 相手のQRコードを読み取る</p>
        <p className="mt-1 text-sm text-gray-500">
          相手に①の画面を見せてもらい、カメラで読み取ってください。双方の名刺が自動で交換され、そのままメッセージも送れるようになります。
        </p>
        <CardQrScanner />
      </div>

      <div className="card mb-6">
        <p className="font-semibold">📱 ARKIVEを使っていない相手に名刺を見せる</p>
        <p className="mt-1 text-sm text-gray-500">
          相手がARKIVEを使っていない場合は、こちらのQRコードを見せてください。スマホ標準のカメラで読み取るだけでWebブラウザ上に名刺ページが開き、連絡先の保存やARKIVEへの登録ができます。
        </p>
        <details className="mt-3">
          <summary className="btn-secondary inline-block cursor-pointer select-none">
            📱 公開名刺ページのQRコードを表示
          </summary>
          <div className="mt-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicQrDataUrl}
              alt="公開名刺ページQRコード"
              className="mx-auto h-auto w-full max-w-[220px] rounded-xl border border-gray-100"
            />
            <p className="mt-3 break-all text-xs text-gray-400">{publicCardUrl}</p>
            <div className="mt-2 flex justify-center">
              <CopyLinkButton url={publicCardUrl} />
            </div>
          </div>
        </details>
      </div>

      <details className="card mb-6">
        <summary className="cursor-pointer select-none font-semibold">
          📷 紙の名刺を撮影して保存する
        </summary>
        <div className="mt-4">
          <CardScanner />
        </div>
      </details>

      <CardList cards={cards} />
    </div>
  );
}
