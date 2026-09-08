"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error("ログインが必要です");
  return { supabase, user };
}

// 現在のパスワードを検証する(共有端末でのセッション残存などから
// 変更・削除系の操作を守るため、実行前に必ず本人確認を行う)。
async function verifyCurrentPassword(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
  password: string
) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("現在のパスワードが正しくありません。");
}

export async function changePassword(formData: FormData) {
  const { supabase, user } = await requireUser();

  const currentPassword = String(formData.get("current_password") || "");
  const newPassword = String(formData.get("new_password") || "");
  const newPasswordConfirm = String(formData.get("new_password_confirm") || "");

  if (newPassword.length < 6) {
    throw new Error("新しいパスワードは6文字以上で入力してください。");
  }
  if (newPassword !== newPasswordConfirm) {
    throw new Error("確認用パスワードが一致しません。");
  }

  await verifyCurrentPassword(supabase, user.email!, currentPassword);

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);

  revalidatePath("/mypage/account");
}

export async function changeEmail(formData: FormData) {
  const { supabase, user } = await requireUser();

  const newEmail = String(formData.get("new_email") || "").trim();
  const currentPassword = String(
    formData.get("current_password_for_email") || ""
  );

  if (!newEmail) throw new Error("新しいメールアドレスを入力してください。");
  if (newEmail === user.email) {
    throw new Error("現在ご利用中のメールアドレスと同じです。");
  }

  await verifyCurrentPassword(supabase, user.email!, currentPassword);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://koryukai-connect.vercel.app";

  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    {
      emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(
        "/mypage/account?emailChanged=1"
      )}`,
    }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/mypage/account");
}

export async function deleteMyAccount(formData: FormData) {
  const { supabase, user } = await requireUser();

  const currentPassword = String(
    formData.get("current_password_for_delete") || ""
  );
  const confirmText = String(formData.get("confirm_text") || "");

  if (confirmText !== "退会する") {
    throw new Error(
      "確認のため、入力欄に「退会する」と正確に入力してください。"
    );
  }

  await verifyCurrentPassword(supabase, user.email!, currentPassword);

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (me?.role === "admin") {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      throw new Error(
        "あなたが唯一の管理者です。先に他のメンバーを管理者に設定してから退会してください。"
      );
    }
  }

  const admin = createAdminClient();

  // プロフィール画像はDBのCASCADE対象外なのでベストエフォートで個別削除する。
  try {
    const { data: files } = await admin.storage.from("avatars").list(user.id);
    if (files && files.length > 0) {
      await admin.storage
        .from("avatars")
        .remove(files.map((f) => `${user.id}/${f.name}`));
    }
  } catch {
    // 失敗してもアカウント削除自体は続行する
  }

  // auth.users を削除すると、参加登録・メッセージ・マッチ・フィード投稿などの
  // 関連データはすべて外部キーのCASCADEで自動的に削除される。
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error(error.message);

  await supabase.auth.signOut();

  redirect(
    `/login?message=${encodeURIComponent(
      "退会手続きが完了しました。これまでのご利用ありがとうございました。"
    )}`
  );
}
