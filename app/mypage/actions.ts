"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const name = String(formData.get("name") || "");
  const company = String(formData.get("company") || "");
  const jobType = String(formData.get("job_type") || "");
  const jobTitle = String(formData.get("job_title") || "");
  const phone = String(formData.get("phone") || "");
  const industry = String(formData.get("industry") || "");
  const connectWith = String(formData.get("connect_with") || "");
  const bio = String(formData.get("bio") || "");
  const tags = formData.getAll("connect_with_tags").map(String);

  const memberCategoryRaw = String(formData.get("member_category") || "general");
  const memberCategory = ["general", "founder", "investor", "mentor"].includes(
    memberCategoryRaw
  )
    ? memberCategoryRaw
    : "general";
  const fundingStage = String(formData.get("funding_stage") || "").trim() || null;
  const investorMentorNote =
    String(formData.get("investor_mentor_note") || "").trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      company,
      job_type: jobType,
      job_title: jobTitle,
      phone,
      industry,
      connect_with: connectWith,
      connect_with_tags: tags,
      bio,
      member_category: memberCategory,
      funding_stage: memberCategory === "founder" ? fundingStage : null,
      investor_mentor_note:
        memberCategory === "investor" || memberCategory === "mentor"
          ? investorMentorNote
          : null,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/mypage");
  redirect("/mypage?saved=1");
}

// プロフィール画像のURLを保存する(アップロード自体はブラウザからSupabase Storageへ直接行う)
export async function updateAvatarUrl(url: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/mypage");
}

// 運営コード(共通コード)による管理者への自己昇格
// STAFF_ADMIN_CODE が未設定の間は「準備中」として弾く(他の外部連携キーと同じ段階的デグレードのパターン)。
// 一致した場合のみ、サービスロールクライアント経由でroleを更新する
// (通常のクライアント更新はDBトリガーでrole列がリセットされ、直接の自己昇格はできない)。
export async function redeemStaffAdminCode(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const configuredCode = process.env.STAFF_ADMIN_CODE;
  if (!configuredCode) {
    throw new Error(
      "この機能は現在準備中です。運営スタッフにお問い合わせください。"
    );
  }

  const code = String(formData.get("code") || "").trim();
  if (!code || code !== configuredCode) {
    throw new Error("運営コードが正しくありません。");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/mypage");
  revalidatePath("/admin");
}
