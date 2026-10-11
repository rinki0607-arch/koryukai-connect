"use client";

import { useState } from "react";

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボードAPIが使えない環境では何もしない(ユーザーが手動でコピーできるよう文字列は画面に表示済み)
    }
  }

  return (
    <button type="button" onClick={handleCopy} className="btn-secondary !min-h-0 px-3 py-1.5 text-xs">
      {copied ? "✅ コピーしました" : "🔗 リンクをコピー"}
    </button>
  );
}
