"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminNavItem {
  href: string;
  label: string;
  // 「以説検証」は現在地にかかわらず常に強調表示する運営上の意図があるため、
  // そのフラグだけ個別に持たせる。
  emphasized?: boolean;
}

const NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/events", label: "交流会管理" },
  { href: "/admin/participants", label: "参加者データ" },
  { href: "/admin/attendance", label: "参加実績ダッシュボード" },
  { href: "/admin/revenue", label: "決済・売上" },
  { href: "/admin/settings/payments", label: "決済設定" },
  { href: "/admin/analytics", label: "全体集計・分析" },
  { href: "/admin/validation", label: "以説検証", emphasized: true },
  { href: "/admin/team", label: "運営メンバー" },
  { href: "/admin/inquiries", label: "通報・問い合わせ" },
];

// 今いる管理画面のページを、ナビの中で文字色・下線で示す。
// 「ダッシュボード」(/admin) は他の全ヘージのプレフィックスになってしまうため、
// 完全一致のときだけ選択中にする(それ以外は「◯◯ の下にいるか」で判定)。
function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminNav() {
  const pathname = usePathname() || "/admin";

  return (
    <div className="mb-6 flex flex-wrap gap-4 border-b border-gray-200 pb-3 text-sm">
      {NAV_ITEMS.map((item) => {
        const isActive = isActivePath(pathname, item.href);
        const baseColor = item.emphasized
          ? "text-primary"
          : isActive
            ? "text-primary"
            : "text-gray-600 hover:text-primary";
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`${baseColor} ${
              item.emphasized || isActive ? "font-semibold" : ""
            } ${isActive ? "underline underline-offset-4" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
