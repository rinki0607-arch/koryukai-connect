"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/mypage");
}
