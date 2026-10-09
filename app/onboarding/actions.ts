"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const company = String(formData.get("company") || "");
  const jobType = String(formData.get("job_type") || "");
  const jobTitle = String(formData.get("job_title") || "");
  const phone = String(formData.get("phone") || "");
  const industry = String(formData.get("industry") || "");
  const connectWith = String(formData.get("connect_with") || "");
  const bio = String(formData.get("bio") || "");
  const tags = formData.getAll("connect_with_tags").map(String);

  const { error } = await supabase
    .from("profiles")
    .update({
      company,
      job_type: jobType,
      job_title: jobTitle,
      phone,
      industry,
      connect_with: connectWith,
      connect_with_tags: tags,
      bio,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/mypage");
  redirect("/events?welcome=1");
}

// プロフィール入力を後回しにする場合も、オンボーディング自体は完了扱いにして
// 毎回リダイレクトされ続けないようにする(入力内容は変更しない)。
export async function skipOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  redirect("/events?welcome=1");
}
