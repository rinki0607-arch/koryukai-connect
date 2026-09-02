import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let displayName: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, name, email")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
    displayName = profile?.name || profile?.email || user.email || null;
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-primary">
          交流会コネクト
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/events" className="text-gray-600 hover:text-primary">
            交流会一覧
          </Link>
          {user && (
            <>
              <Link href="/mypage" className="text-gray-600 hover:text-primary">
                マイページ
              </Link>
              <Link
                href="/mypage/matches"
                className="text-gray-600 hover:text-primary"
              >
                マッチ一覧
              </Link>
            </>
          )}
          {isAdmin && (
            <Link href="/admin" className="text-gray-600 hover:text-primary">
              管理画面
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-gray-500 sm:inline">
                {displayName}
              </span>
              <LogoutButton />
            </div>
          ) : (
            <Link href="/login" className="btn-primary">
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
