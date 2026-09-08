import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase Authのメールリンク(パスワード再設定・メールアドレス変更確認など)から
// 戻ってきたときに、認可コードをセッションへ交換するルートハンドラ。
// サインアップ確認メールはこのルートを経由しない(デフォルトのSite URLへ直接戻る)。
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/mypage";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "リンクが無効か、有効期限が切れています。もう一度お試しください。"
    )}`
  );
}
