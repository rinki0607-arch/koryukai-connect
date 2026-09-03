import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export default async function InstallPage() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://arkive.example.com";
  const qrDataUrl = await QRCode.toDataURL(appUrl, {
    margin: 1,
    width: 320,
    color: { dark: "#10192f", light: "#ffffffff" },
  });

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="mb-2 text-xl font-bold">ARKIVEをスマホに追加</h1>
      <p className="mb-6 text-sm text-gray-500">
        このQRコードをスマホのカメラで読み取ってください。アプリストアを経由せず、その場でホーム画面に追加できます。
      </p>
      <div className="card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="ARKIVEインストール用QRコード"
          className="mx-auto h-auto w-full max-w-[280px]"
        />
      </div>

      <div className="mt-8 space-y-4 text-left">
        <div className="card">
          <p className="mb-3 font-semibold">Androidの方(Chrome)</p>
          <ol className="space-y-2.5">
            {[
              "QRコードを読み取ってARKIVEを開く",
              "画面下部(または右上メニュー)に出る「ホーム画面に追加」をタップ",
              "ホーム画面にARKIVEのアイコンが追加されます",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="card">
          <p className="mb-3 font-semibold">iPhoneの方(Safari)</p>
          <ol className="space-y-2.5">
            {[
              "QRコードを読み取ってARKIVEを開く(Safariで開いてください)",
              "画面下部の共有ボタン(□に↑)をタップ",
              "「ホーム画面に追加」を選び、右上の「追加」をタップ",
              "ホーム画面にARKIVEのアイコンが追加されます",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-light text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
