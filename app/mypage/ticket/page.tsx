import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TicketPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/ticket");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const p = profile as Profile;
  const qrValue = `ARKIVE:v1:${p.ticket_token}`;
  const qrDataUrl = await QRCode.toDataURL(qrValue, {
    margin: 1,
    width: 320,
    color: { dark: "#10192f", light: "#ffffffff" },
  });

  return (
    <div className="mx-auto max-w-sm text-center">
      <h1 className="mb-2 text-xl font-bold">マイQRコード</h1>
      <p className="mb-6 text-sm text-gray-500">
        交流会当日は、この画面を受付でご提示ください。運営がスキャンして受付・退出を記録します。
      </p>
      <div className="card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="参加証QRコード"
          className="mx-auto h-auto w-full max-w-[280px]"
        />
        <p className="mt-4 font-semibold">{p.name || "(名前未設定)"}</p>
        {p.company && <p className="text-sm text-gray-500">{p.company}</p>}
      </div>
      <p className="mt-4 text-xs text-gray-400">
        このQRコードは全ての交流会で共通してお使いいただけます。
      </p>
    </div>
  );
}
