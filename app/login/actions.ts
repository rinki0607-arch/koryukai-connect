"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/mypage");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "");
  const next = String(formData.get("next") || "/mypage");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&mode=signup&next=${encodeURIComponent(next)}`);
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "確認メールを送信しました。メール内のリンクを開いてからログインしてください。"
    )}&next=${encodeURIComponent(next)}`
  );
}

// Googleでのログイン/新規登録(両方共通)。
// SupabaseダッシュボードでGoogleプロバイダを有効化していない間は
// 「provider is not enabled」エラーになり、ログイン画面に戻ってエラーを表示する。
export async function signInWithGoogle(formData: FormData) {
  const next = String(formData.get("next") || "/mypage");
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://koryukai-connect.vercel.app";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data?.url) {
    redirect(
      `/login?error=${encodeURIComponent(
        error?.message || "Googleログインを開始できませんでした"
      )}&next=${encodeURIComponent(next)}`
    );
  }

  redirect(data!.url);
}
