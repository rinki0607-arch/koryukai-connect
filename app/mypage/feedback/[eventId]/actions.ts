"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // 仮説1・3：交流会のあとに面談(個別相談)を希望したかを記録する。
  // 参加者が自分で書き換えられない列なので、サーバー側の管理用クライアントで本人の行だけを更新する。
  if (formData.get("wants_interview") === "on") {
    try {
      const admin = createAdminClient();
      await admin
        .from("registrations")
        .update({ interview_requested_at: new Date().toISOString() })
        .eq("event_id", eventId)
        .eq("participant_id", user.id)
        .is("interview_requested_at", null);
    } catch {
      // 記録に失敗してもアンケート送信は完了させる
    }
  }

  revalidatePath("/mypage");
  redirect("/mypage?feedback=done");
}
