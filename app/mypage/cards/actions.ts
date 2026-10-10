"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBusinessCard(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const name = String(formData.get("name") || "").trim();
  const company = String(formData.get("company") || "").trim();
  const jobTitle = String(formData.get("job_title") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!name && !company) {
    throw new Error("氏名または会社名のいずれかは入力してください");
  }

  const { error } = await supabase.from("business_cards").insert({
    owner_id: user.id,
    name: name || null,
    company: company || null,
    job_title: jobTitle || null,
    phone: phone || null,
    email: email || null,
    note: note || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/mypage/cards");
}

export async function deleteBusinessCard(cardId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase
    .from("business_cards")
    .delete()
    .eq("id", cardId)
    .eq("owner_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/mypage/cards");
}

export interface CardQrResult {
  ok: boolean;
  message: string;
  name?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  alreadyExchanged?: boolean;
}

function parseCardToken(raw: string): string | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^ARKIVE:card:v1:(.+)$/);
  return match ? match[1] : null;
}

export async function redeemCardQr(rawQrValue: string): Promise<CardQrResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "ログインが必要です" };

  const token = parseCardToken(rawQrValue);
  if (!token) {
    return { ok: false, message: "ARKIVEの名刺QRコードではありません" };
  }

  const { data, error } = await supabase
    .rpc("redeem_card_qr", { p_token: token })
    .single();

  if (error) {
    return {
      ok: false,
      message: error.message || "名刺交換に失敗しました",
    };
  }

  const row = data as {
    participant_id: string;
    name: string | null;
    company: string | null;
    job_title: string | null;
    avatar_url: string | null;
    already_exchanged: boolean;
  };

  revalidatePath("/mypage/cards");

  return {
    ok: true,
    message: row.already_exchanged
      ? "この相手とは交換済みです(最新の情報に更新しました)"
      : "名刺交換が完了しました",
    name: row.name,
    company: row.company,
    avatarUrl: row.avatar_url,
    alreadyExchanged: row.already_exchanged,
  };
}
