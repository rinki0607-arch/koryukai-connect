"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleSave(targetId: string, save: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.rpc("toggle_saved_profile", {
    p_target: targetId,
    p_save: save,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/members");
  revalidatePath(`/members/${targetId}`);
}

export async function toggleGeneralLike(targetId: string, like: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.rpc("toggle_general_like", {
    p_target: targetId,
    p_like: like,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/members");
  revalidatePath(`/members/${targetId}`);
  revalidatePath("/mypage/matches");
}
