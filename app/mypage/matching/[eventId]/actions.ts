"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function likeParticipant(
  eventId: string,
  targetId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("likes").insert({
    event_id: eventId,
    from_id: user.id,
    to_id: targetId,
  });

  if (error && !error.message.includes("duplicate")) {
    throw new Error(error.message);
  }

  revalidatePath(`/mypage/matching/${eventId}`);
}

export async function unlikeParticipant(
  eventId: string,
  targetId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("event_id", eventId)
    .eq("from_id", user.id)
    .eq("to_id", targetId);

  if (error) throw new Error(error.message);

  revalidatePath(`/mypage/matching/${eventId}`);
}
