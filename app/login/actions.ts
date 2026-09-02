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
