"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// ページ遷移の「待たされてる感」を減らすための、画面上部の進捗バー。
// 実際の描画が終わるのを待たず、リンクをタップした瞬間に動き出して
// 「反応した」ことを先に見せる。新しいページに切り替わったら一気に進めて消える。
export default function NavProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timers = useRef<number[]>([]);
  const prevPath = useRef(pathname);

  useEffect(() => {
    const clearTimers = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const link = (e.target as HTMLElement)?.closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || link.target === "_blank") return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      clearTimers();
      setVisible(true);
      setWidth(0);
      // 実際の読み込み時間は分からないので、少しずつ進めつつ80%で足踏みさせておく
      timers.current.push(window.setTimeout(() => setWidth(30), 50));
      timers.current.push(window.setTimeout(() => setWidth(65), 300));
      timers.current.push(window.setTimeout(() => setWidth(80), 900));
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      clearTimers();
    };
  }, []);

  // 新しいページの描画が終わって pathname が切り替わったら、一気に100%にして消す
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    if (!visible) return;

    setWidth(100);
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 200);
    return () => window.clearTimeout(hideTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] h-[3px] w-full"
    >
      <div
        className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
