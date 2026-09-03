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

      <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_10px_30px_rgba(16,25,47,0.14)]">
        <div className="relative bg-primary px-6 py-5 text-left text-white">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-accent/20 blur-xl" />
          <p className="relative font-mono text-[10px] font-bold tracking-[0.2em] text-accent">
            ARKIVE MEMBER PASS
          </p>
          <p className="relative mt-1 font-semibold">
            {p.name || "(名前未設定)"}
          </p>
          {p.company && (
            <p className="relative text-sm text-white/60">{p.company}</p>
          )}
        </div>

        <div className="relative px-6 py-6">
          <div className="pointer-events-none absolute -left-3 top-0 h-6 w-6 -translate-y-1/2 rounded-full bg-[#f4f5f9]" />
          <div className="pointer-events-none absolute -right-3 top-0 h-6 w-6 -translate-y-1/2 rounded-full bg-[#f4f5f9]" />
          <div className="pointer-events-none absolute left-6 right-6 top-0 border-t border-dashed border-gray-200" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="参加証QRコード"
            className="mx-auto h-auto w-full max-w-[240px]"
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        このQRコードは全ての交流会で共通してお使いいただけます。
      </p>
    </div>
  );
}
