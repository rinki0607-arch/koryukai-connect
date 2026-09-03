"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function submitEventFeedback(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const eventId = String(formData.get("event_id") || "");
  const rating = Number(formData.get("rating") || 0);
  const wouldRecommend = String(formData.get("would_recommend") || "");
  const comment = String(formData.get("comment") || "");

  if (!eventId) throw new Error("交流会が指定されていません");
  if (!rating || rating < 1 || rating > 5) throw new Error("満足度を選択してください");
  if (!["yes", "neutral", "no"].includes(wouldRecommend)) {
    throw new Error("また参加したいかを選択してください");
  }

  const { error } = await supabase.rpc("submit_event_feedback", {
    p_event_id: eventId,
    p_rating: rating,
    p_would_recommend: wouldRecommend,
    p_comment: comment,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/mypage");
  redirect("/mypage?feedback=done");
}
