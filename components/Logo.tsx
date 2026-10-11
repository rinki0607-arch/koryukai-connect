// ARKIVEのロゴマーク(アイコン)。暖色のコーラルを基調にした、角丸スクエア+
// シンプルな「A」モノグラム。PayPay・Pairsのような、親しみやすく軽い
// イメージのアイコンを目指す(次世代感のある六角形バッジやグロッシーな加工は排除)。
export default function Logo({ size = 32 }: { size?: number }) {
  const radius = Math.round(size * 0.32);
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "#D6304A",
        boxShadow: "0 2px 6px rgba(214,48,74,0.35)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: radius,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0))",
        }}
      />
      <span
        aria-hidden
        className="relative font-display font-extrabold text-white"
        style={{ fontSize: size * 0.52, lineHeight: 1 }}
      >
        A
      </span>
    </span>
  );
}
