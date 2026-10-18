import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import BottomTabBar from "@/components/BottomTabBar";
import Logo from "@/components/Logo";

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 10.5a6 6 0 1 1 12 0c0 2.2.6 3.6 1.4 4.8.5.7 0 1.7-.9 1.7H5.5c-.9 0-1.4-1-.9-1.7.8-1.2 1.4-2.6 1.4-4.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 19.5a2.5 2.5 0 0 0 5 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let displayName: string | null = null;
  let unreadCount = 0;
  let notifCount = 0;

  if (user) {
    const [{ data: profile }, { data: unread }, { data: notif }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("role, name, email")
          .eq("id", user.id)
          .single(),
        supabase.rpc("get_unread_message_count"),
        supabase.rpc("get_unread_notification_count"),
      ]);
    isAdmin = profile?.role === "admin";
    displayName = profile?.name || profile?.email || user.email || null;
    unreadCount = typeof unread === "number" ? unread : 0;
    notifCount = typeof notif === "number" ? notif : 0;
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-primary"
          >
            <Logo size={34} />
            <span className="font-display">ARKIVE</span>
          </Link>

          {/* デスクトップ幅では主要機能のみをナビに出し、その他(QR/名刺/ランキング等)はマイページから辿る。
              モバイル幅は下部タブバーに任せてシンプルにする */}
          <nav className="hidden items-center gap-5 text-sm lg:flex">
            <Link href="/events" className="text-gray-600 transition hover:text-primary">
              交流会一覧
            </Link>
            {user && (
              <>
                <Link href="/members" className="text-gray-600 transition hover:text-primary">
                  参加者名簿
                </Link>
                <Link href="/feed" className="text-gray-600 transition hover:text-primary">
                  フィード
                </Link>
                <Link
                  href="/mypage/matches"
                  className="relative text-gray-600 transition hover:text-primary"
                >
                  メッセージ
                  {unreadCount > 0 && (
                    <span className="absolute -right-3 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-[#241a03]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
                <Link href="/mypage" className="text-gray-600 transition hover:text-primary">
                  マイページ
                </Link>
                <Link
                  href="/notifications"
                  aria-label="お知らせ"
                  className="relative text-gray-600 transition hover:text-primary"
                >
                  <BellIcon />
                  {notifCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                </Link>
              </>
            )}
            {isAdmin && (
              <Link href="/admin" className="text-gray-600 transition hover:text-primary">
                管理画面
              </Link>
            )}
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-gray-500">{displayName}</span>
                <LogoutButton />
              </div>
            ) : (
              <Link href="/login" className="btn-primary">
                ログイン
              </Link>
            )}
          </nav>

          {/* モバイル幅: お知らせ・管理者リンク・ログアウトだけを右上に出す(それ以外は下部タブバーに任せる) */}
          <div className="flex items-center gap-3 lg:hidden">
            {user && (
              <Link
                href="/notifications"
                aria-label="お知らせ"
                className="relative text-gray-500 hover:text-primary"
              >
                <BellIcon />
                {notifCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="text-xs font-semibold text-gray-500 hover:text-primary"
              >
                管理画面
              </Link>
            )}
            {user ? (
              <LogoutButton />
            ) : (
              <Link href="/login" className="btn-primary !min-h-0 px-4 py-2 text-xs">
                ログイン
              </Link>
            )}
          </div>
        </div>
      </header>

      <BottomTabBar loggedIn={!!user} unreadCount={unreadCount} />
    </>
  );
}
