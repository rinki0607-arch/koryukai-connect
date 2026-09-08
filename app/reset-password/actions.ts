"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePasswordAfterReset(formData: FormData) {
  const password = String(formData.get("password") || "");
  const passwordConfirm = String(formData.get("password_confirm") || "");

  if (password.length < 6) {
    redirect(
      `/reset-password?error=${encodeURIComponent(
        "パスワードは6文字以上で入力してください。"
      )}`
    );
  }
  if (password !== passwordConfirm) {
    redirect(
      `/reset-password?error=${encodeURIComponent(
        "確認用パスワードが一致しません。"
      )}`
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?error=${encodeURIComponent(
        "セッションの有効期限が切れています。もう一度パスワード再設定をお試しください。"
      )}`
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  // 念のため一度サインアウトし、新しいパスワードで改めてログインしてもらう
  // (共有端末でリンクを開いていた場合などのセッション残存を避けるため)。
  await supabase.auth.signOut();

  redirect(
    `/login?message=${encodeURIComponent(
      "パスワードを再設定しました。新しいパスワードでログインしてください。"
    )}`
  );
}
