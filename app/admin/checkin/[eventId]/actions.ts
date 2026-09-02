"use server";

import { createClient } from "@/lib/supabase/server";

export interface ScanResult {
  ok: boolean;
  message: string;
  action?: "checked_in" | "checked_out" | "already_out";
  name?: string | null;
  company?: string | null;
}

function parseTicketToken(raw: string): string | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^ARKIVE:v1:(.+)$/);
  if (match) return match[1];
  // 素のUUIDが読み取られた場合もフォールバックで許容
  if (/^[0-9a-f-]{20,}$/i.test(trimmed)) return trimmed;
  return null;
}

export async function recordScan(
  eventId: string,
  rawQrValue: string
): Promise<ScanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "ログインが必要です" };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") {
    return { ok: false, message: "受付担当(運営)のみ利用できます" };
  }

  const token = parseTicketToken(rawQrValue);
  if (!token) {
    return { ok: false, message: "ARKIVEのQRコードではありません" };
  }

  const { data: participant } = await supabase
    .from("profiles")
    .select("id, name, company")
    .eq("ticket_token", token)
    .maybeSingle();

  if (!participant) {
    return { ok: false, message: "該当する参加者が見つかりません" };
  }

  const { data: existing } = await supabase
    .from("attendance")
    .select("*")
    .eq("event_id", eventId)
    .eq("participant_id", participant.id)
    .maybeSingle();

  const now = new Date().toISOString();

  if (!existing || !existing.checked_in_at) {
    const { error } = await supabase.from("attendance").upsert(
      {
        event_id: eventId,
        participant_id: participant.id,
        checked_in_at: now,
      },
      { onConflict: "event_id,participant_id" }
    );
    if (error) return { ok: false, message: error.message };
    return {
      ok: true,
      action: "checked_in",
      message: "受付完了",
      name: participant.name,
      company: participant.company,
    };
  }

  if (!existing.checked_out_at) {
    const { error } = await supabase
      .from("attendance")
      .update({ checked_out_at: now })
      .eq("id", existing.id);
    if (error) return { ok: false, message: error.message };
    return {
      ok: true,
      action: "checked_out",
      message: "退出を記録しました",
      name: participant.name,
      company: participant.company,
    };
  }

  return {
    ok: true,
    action: "already_out",
    message: "本日は受付・退出とも記録済みです",
    name: participant.name,
    company: participant.company,
  };
}
