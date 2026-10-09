"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof window === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// ワンタップでホーム画面に追加するボタン。
// Android/Chrome系は beforeinstallprompt を拾ってネイティブのインストールダイアログを出す。
// iOS Safari は仕様上このAPIに対応していないため、共有ボタンからの手順を案内するモーダルを表示する。
export default function InstallButton({
  className = "",
  label = "📲 ホーム画面に追加",
}: {
  className?: string;
  label?: string;
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIos());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        {label}
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="card w-full max-w-sm bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 font-semibold text-primary">
              ホーム画面に追加する方法
            </p>
            {ios ? (
              <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600">
                <li>Safariで開いていることを確認してください</li>
                <li>画面下部の共有ボタン(□に↑)をタップ</li>
                <li>「ホーム画面に追加」を選ぶ</li>
                <li>右上の「追加」をタップ</li>
              </ol>
            ) : (
              <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600">
                <li>ブラウザ右上のメニュー(⋮)を開く</li>
                <li>「ホーム画面に追加」または「アプリをインストール」を選ぶ</li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="btn-secondary mt-4 w-full"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
