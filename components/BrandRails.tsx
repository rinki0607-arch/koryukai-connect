import Link from "next/link";
import Logo from "@/components/Logo";

/**
 * 超ワイド画面(2xl以上)で余白になる本文左右のスパースに、
 * ARKIVE と運営元(ヒューマンキャピタル株式会社)のブランド要素を、
 * 台帳(ledger)の背表紙のようにあしらう装飾レール。
 * 通常のノートPC幅では表示されず、レイアウトにも影響しない。
 */
function TickRule() {
  return (
    <div className="flex flex-col items-center gap-[14px] opacity-[0.35]">
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="h-px w-4 bg-primary"
          style={{ opacity: i % 3 === 0 ? 0.9 : 0.35 }}
        />
      ))}
    </div>
  );
}

export function BrandRailLeft() {
  return (
    <aside
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 hidden h-screen w-36 flex-col items-center overflow-hidden pb-8 pt-28 2xl:flex"
    >
      <Link
        href="/"
        className="pointer-events-auto shrink-0 transition hover:opacity-90"
      >
        <Logo size={36} />
      </Link>

      <div className="mt-10 flex flex-col items-center gap-5">
        <TickRule />
        <p
          className="select-none font-display text-[15px] font-bold tracking-[0.2em] text-primary"
          style={{ writingMode: "vertical-rl" }}
        >
          ARKIVE
        </p>
        <TickRule />
      </div>

      <p
        className="mt-auto select-none font-mono text-[10px] tracking-[0.25em] text-gray-300"
        style={{ writingMode: "vertical-rl" }}
      >
        2026 EDITION
      </p>
    </aside>
  );
}

export function BrandRailRight() {
  return (
    <aside
      aria-hidden="true"
      className="pointer-events-none fixed right-0 top-0 hidden h-screen w-44 flex-col items-center overflow-hidden pb-8 pt-28 2xl:flex"
    >
      <p className="select-none font-mono text-[10px] font-bold tracking-[0.3em] text-accent-dark">
        OPERATED BY
      </p>

      <div className="mt-10 flex flex-col items-center gap-3">
        <TickRule />
        <p
          className="select-none font-display text-[15px] font-bold tracking-[0.14em] text-primary"
          style={{ writingMode: "vertical-rl" }}
        >
          ヒューマンキャピタル
        </p>
        <p className="select-none font-mono text-[10px] tracking-[0.2em] text-gray-400">
          株式会社
        </p>
        <TickRule />
      </div>

      <p className="mt-auto max-w-[8.5rem] select-none text-center text-[11px] leading-[1.9] text-gray-400">
        人的資本
        <br />
        人と人とのつながりを、
        <br />
        大切に。
      </p>
    </aside>
  );
}
