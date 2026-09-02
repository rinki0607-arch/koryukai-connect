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

      <div className="mt-8 space-y-6 text-left">
        <div className="card">
          <p className="mb-2 font-semibold">Androidの方(Chrome)</p>
          <ol className="list-inside list-decimal space-y-1 text-sm text-gray-600">
            <li>QRコードを読み取ってARKIVEを開く</li>
            <li>
              画面下部(または右上メニュー)に出る「ホーム画面に追加」をタップ
            </li>
            <li>ホーム画面にARKIVEのアイコンが追加されます</li>
          </ol>
        </div>
        <div className="card">
          <p className="mb-2 font-semibold">iPhoneの方(Safari)</p>
          <ol className="list-inside list-decimal space-y-1 text-sm text-gray-600">
            <li>QRコードを読み取ってARKIVEを開く(Safariで開いてください)</li>
            <li>画面下部の共有ボタン(□に↑)をタップ</li>
            <li>
              「ホーム画面に追加」を選び、右上の「追加」をタップ
            </li>
            <li>ホーム画面にARKIVEのアイコンが追加されます</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
