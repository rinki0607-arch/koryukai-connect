"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function resolveInquiry(inquiryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("運営権限が必要です");

  // DB関数(resolve_support_inquiry)側もis_admin()を内部で確認しているため二重防御になる。
  const { error } = await supabase.rpc("resolve_support_inquiry", {
    inquiry_id: inquiryId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/inquiries");
}
