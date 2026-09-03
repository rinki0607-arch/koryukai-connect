import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import BottomTabBar from "@/components/BottomTabBar";
import Logo from "@/components/Logo";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let displayName: string | null = null;
  let unreadCount = 0;

  if (user) {
    const [{ data: profile }, { data: unread }] = await Promise.all([
      supabase.from("profiles").select("role, name, email").eq("id", user.id).single(),
      supabase.rpc("get_unread_message_count"),
    ]);
    isAdmin = profile?.role === "admin";
    displayName = profile?.name || profile?.email || user.email || null;
    unreadCount = typeof unread === "number" ? unread : 0;
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
            <span
              style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.06em" }}
            >
              ARKIVE
            </span>
          </Link>

          {/* デスクトップ幅ではフルナビ、モバイル幅は下部タブバーに任せてシンプルに */}
          <nav className="hidden items-center gap-5 text-sm lg:flex">
            <Link href="/events" className="text-gray-600 transition hover:text-primary">
              交流会一覧
            </Link>
            {user && (
              <>
                <Link href="/mypage" className="text-gray-600 transition hover:text-primary">
                  マイページ
                </Link>
                <Link href="/members" className="text-gray-600 transition hover:text-primary">
                  参加者名簿
                </Link>
                <Link href="/feed" className="text-gray-600 transition hover:text-primary">
                  コミュニティ
                </Link>
                <Link href="/mypage/ticket" className="text-gray-600 transition hover:text-primary">
                  マイQRコード
                </Link>
                <Link href="/mypage/cards" className="text-gray-600 transition hover:text-primary">
                  マイ名刺
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

          {/* モバイル幅: 管理者リンクとログアウトだけ右上に出す(それ以外は下部タブバー) */}
          <div className="flex items-center gap-3 lg:hidden">
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
