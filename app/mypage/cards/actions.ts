"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBusinessCard(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const name = String(formData.get("name") || "").trim();
  const company = String(formData.get("company") || "").trim();
  const jobTitle = String(formData.get("job_title") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!name && !company) {
    throw new Error("氏名または会社名のいずれかは入力してください");
  }

  const { error } = await supabase.from("business_cards").insert({
    owner_id: user.id,
    name: name || null,
    company: company || null,
    job_title: jobTitle || null,
    phone: phone || null,
    email: email || null,
    note: note || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/mypage/cards");
}

export async function deleteBusinessCard(cardId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase
    .from("business_cards")
    .delete()
    .eq("id", cardId)
    .eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/mypage/cards");
}
