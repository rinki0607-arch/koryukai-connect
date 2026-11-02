"use client";

import { useEffect, useState } from "react";
import InstallButton from "@/components/InstallButton";

const DISMISS_KEY = "arkive_install_banner_dismissed_until";
const SNOOZE_DAYS = 14;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// 「ホーム画面に追加」をまだしていない人に、控えめに気づいてもらうための帯。
// すでに追加済みの人には出さない。閉じたら2週間はこの端末に出さない(localStorageで記憶)。
export default function InstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      const until = window.localStorage.getItem(DISMISS_KEY);
      if (until && Date.now() < Number(until)) return;
    } catch {
      // localStorageが使えない環境では、出す側に倒す(実害がないため)
    }
    setShow(true);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000)
      );
    } catch {
      // 記憶できなくても、閉じる操作自体はその場で効かせる
    }
  };

  if (!show) return null;

  return (
    <div className="relative z-20 flex items-center justify-between gap-3 bg-primary px-4 py-2.5 text-sm text-white">
      <span className="flex-1">
        📲 ホーム画面に追加すると、次回からもっと早く開けます
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <InstallButton
          className="min-h-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-primary"
          label="追加する"
        />
        <button
          type="button"
          onClick={dismiss}
          aria-label="閉じる"
          className="px-1 text-white/80 transition hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
