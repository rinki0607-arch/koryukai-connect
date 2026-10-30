import Link from "next/link";
import { ReactNode } from "react";

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 5 7 12l8 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 画面タイトルの表示を全ページで揃えるための共通ヘッダー。
 * タイトル直下のアクセントバー・サブタイトルの余白・戻るリンクの見た目を統一し、
 * ページによってバラバラだった「見出しの置き方」を1つのパターンにまとめる。
 */
export default function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "戻る",
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-primary"
        >
          <BackIcon />
          {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <div className="mt-2 h-1 w-10 rounded-full bg-gradient-to-r from-accent to-accent-dark" />
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {subtitle && <p className="mt-3 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}
