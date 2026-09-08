"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const next = String(formData.get("next") || "/mypage");

  if (!email) {
    redirect(
      `/forgot-password?error=${encodeURIComponent(
        "メールアドレスを入力してください。"
      )}&next=${encodeURIComponent(next)}`
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://koryukai-connect.vercel.app";

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(
      "/reset-password"
    )}`,
  });

  // メール未登録かどうかに関わらず同じメッセージを表示する(第三者にアカウントの
  // 存在有無を推測されないようにするため)。
  redirect(
    `/forgot-password?message=${encodeURIComponent(
      "ご入力いただいたメールアドレスが登録されている場合、パスワード再設定用のメールをお送りしました。メール内のリンクを開いて新しいパスワードを設定してください。"
    )}`
  );
}
