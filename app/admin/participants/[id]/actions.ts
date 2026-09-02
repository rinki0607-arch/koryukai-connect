"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error("権限がありません");

  return { supabase, userId: user.id };
}

export async function updateParticipant(
  participantId: string,
  formData: FormData
) {
  const { supabase, userId } = await assertAdmin();

  const name = String(formData.get("name") || "");
  const company = String(formData.get("company") || "");
  const industry = String(formData.get("industry") || "");
  const connectWith = String(formData.get("connect_with") || "");
  const role = String(formData.get("role") || "participant");

  // 自分自身を最後の管理者から降格させることを防ぐ
  if (userId === participantId && role !== "admin") {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      throw new Error(
        "あなたが唯一の管理者です。自分自身の管理者権限は外せません。"
      );
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      company,
      industry,
      connect_with: connectWith,
      role,
    })
    .eq("id", participantId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/participants/${participantId}`);
  revalidatePath("/admin/participants");
  revalidatePath("/admin/team");
}

export async function deleteParticipant(participantId: string) {
  const { userId } = await assertAdmin();

  if (userId === participantId) {
    throw new Error("自分自身のアカウントはここから削除できません。");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(participantId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/participants");
  redirect("/admin/participants");
}
