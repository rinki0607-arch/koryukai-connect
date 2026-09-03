// ARKIVEのロゴマーク(アイコン)。ヒューマンキャピタル株式会社のブランドカラーである赤×白を基調に、
// 近未来的な六角形バッジ+ジオメトリックな「A」モノグラムでデザイン。
// アプリ全体の配色(ネイビー×ゴールド)はこのロゴの外では変更しない。
const HEX_CLIP =
  "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)";

export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        clipPath: HEX_CLIP,
        background:
          "linear-gradient(150deg, #ff5252 0%, #e0102a 50%, #6e040f 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -10px 16px rgba(0,0,0,0.3)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-[45%] w-full"
        style={{
          clipPath: HEX_CLIP,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0))",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ clipPath: HEX_CLIP, border: "1px solid rgba(255,255,255,0.22)" }}
      />
      <svg
        viewBox="0 0 100 100"
        width="54%"
        height="54%"
        style={{
          position: "relative",
          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))",
        }}
      >
        <path
          d="M50 8 L89 90 L60 90 L50 64 L40 90 L11 90 Z M35 76 L65 76 L57 56 L43 56 Z"
          fill="white"
          fillRule="evenodd"
        />
      </svg>
    </span>
  );
}
