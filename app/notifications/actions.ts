"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markRead(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.rpc("mark_notification_read", {
    p_id: id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/notifications");
}

export async function markAllRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw new Error(error.message);

  revalidatePath("/notifications");
}
