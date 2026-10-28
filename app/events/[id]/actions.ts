"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitRegistration(formData: FormData) {
  const eventId = String(formData.get("event_id"));
  const attending = formData.get("attending") === "yes";
  const afterparty = formData.get("afterparty") === "yes";
  const industry = String(formData.get("industry") || "");
  const connectWith = String(formData.get("connect_with") || "");
  const tags = formData.getAll("connect_with_tags").map(String);
  const goalText = String(formData.get("goal_text") || "").trim();
  const saveAsDefault = formData.get("save_as_default") === "on";
  const wantsReceipt = formData.get("wants_receipt") === "on";
  const receiptName = String(formData.get("receipt_name") || "").trim() || null;
  // 仮説3：事前マッチング(話すとよい3人の案内)の希望 / 仮説4：紹介元
  const wantsIntro = formData.get("wants_intro") === "on";
  const referralRaw = String(formData.get("referral_code") || "").trim();
  const referralCode = referralRaw ? referralRaw.slice(0, 60) : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { error } = await supabase.from("registrations").upsert(
    {
      event_id: eventId,
      participant_id: user.id,
      attending,
      afterparty: attending ? afterparty : false,
      industry,
      connect_with: connectWith,
      connect_with_tags: tags,
      goal_text: attending ? goalText || null : null,
      wants_receipt: attending ? wantsReceipt : false,
      receipt_name: attending ? receiptName : null,
      wants_intro: attending ? wantsIntro : false,
      // 紹介元は入力がある時だけ書き込む(空欄で既存の記録を消さない)
      ...(referralCode ? { referral_code: referralCode } : {}),
    },
    { onConflict: "event_id,participant_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (saveAsDefault) {
    await supabase
      .from("profiles")
      .update({
        industry,
        connect_with: connectWith,
        connect_with_tags: tags,
      })
      .eq("id", user.id);
  }

  revalidatePath(`/events/${eventId}`);
}
