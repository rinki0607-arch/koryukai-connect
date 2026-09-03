"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function resolveInquiry(inquiryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.rpc("resolve_support_inquiry", {
    inquiry_id: inquiryId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/inquiries");
}
