"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendMessage(partnerId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("messages").insert({
    sender_id: user.id,
    recipient_id: partnerId,
    content: trimmed,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/mypage/matches/${partnerId}`);
  revalidatePath("/mypage/matches");
}

export async function markConversationRead(partnerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc("mark_conversation_read", { partner: partnerId });
  revalidatePath("/mypage/matches");
}
