import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// オンボーディング(プロフィール入力)が未完了のユーザーをリダイレクトしない経路。
// ここに無い経路は、ログイン済み・オンボーディング未完了なら /onboarding に飛ばされる。
const ONBOARDING_EXEMPT_PREFIXES = [
  "/onboarding",
  "/login",
  "/install",
  "/manifest.json",
  "/sw.js",
  "/api",
  "/icons",
  "/c",
];

// オンボーディング確認済み(または管理者)であることを記録するCookie。
// これが付いているリクエストは、profilesテーブルへの問い合わせを省略して応答を速くする。
const ONBOARDED_COOKIE = "arkive_onboarded";

function isExemptFromOnboarding(pathname: string) {
  return ONBOARDING_EXEMPT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // このアプリはスマホで共有・利用される前提のため、未ログインでリンク(トップページ)を開いた場合は、
  // 紹介ランディングを挟まず、最初に新規登録/ログイン画面を表示する。
  if (!user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("mode", "signup");
    return NextResponse.redirect(url);
  }

  if (user && !isExemptFromOnboarding(pathname)) {
    const alreadyConfirmed = request.cookies.get(ONBOARDED_COOKIE)?.value === "1";

    if (!alreadyConfirmed) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, role")
        .eq("id", user.id)
        .maybeSingle();

      const needsOnboarding =
        !!profile && profile.role !== "admin" && profile.onboarding_completed === false;

      if (needsOnboarding) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }

      // 管理者、またはオンボーディング完了が確認できた場合のみCookieに記録する。
      // 次回以降のアクセスでは、このCookieがある限りprofilesテーブルへの問い合わせを省略する。
      if (profile && (profile.role === "admin" || profile.onboarding_completed !== false)) {
        response.cookies.set(ONBOARDED_COOKIE, "1", {
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
