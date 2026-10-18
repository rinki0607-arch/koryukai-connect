// ARKIVEのロゴマーク。ホーム画面に追加したときに表示されるPWAアイコン
// (/icons/icon-192.png)と完全に同じ画像を使うことで、「表示上のアイコン」と
// 「アプリ内のロゴ」が違う状態を解消している。
export default function Logo({ size = 32 }: { size?: number }) {
  const radius = Math.round(size * 0.32);
  return (
    <span
      className="relative inline-flex shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        boxShadow: "0 2px 6px rgba(214,48,74,0.35)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt="ARKIVE"
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
