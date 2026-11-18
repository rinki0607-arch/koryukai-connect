"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 仮説検証ダッシュボード(運営専用)の書き込み。
// DB側(RLS + registrations保護トリガー / validation_notesのadmin専用ポリシー)でも
// 管理者以外の書き込みは拒否されるが、Server Actionは直接呼び出しうるエンドポイントでもあるため、
// ここでも明示的にadmin権限を確認してから処理する(多重防御)。
const FLAG_FIELDS = ["intro_sent_at", "interview_done_at", "enrolled_at"] as const;
type FlagField = (typeof FLAG_FIELDS)[number];

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("運営権限が必要です");
  return { supabase, user };
}

export async function toggleRegistrationFlag(formData: FormData) {
  const { supabase } = await requireAdmin();

  const registrationId = String(formData.get("registration_id") || "");
  const field = String(formData.get("field") || "") as FlagField;
  const eventId = String(formData.get("event_id") || "");
  const on = formData.get("on") === "1";
  if (!registrationId || !FLAG_FIELDS.includes(field)) return;

  const { error } = await supabase
    .from("registrations")
    .update({ [field]: on ? new Date().toISOString() : null })
    .eq("id", registrationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/validation/${eventId}`);
}

export async function saveValidationNote(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const key = String(formData.get("key") || "");
  const eventId = String(formData.get("event_id") || "");
  if (!/^(h1|h5:[0-9a-f-]{36})$/.test(key)) return;

  const value: Record<string, number | boolean | string> = {};
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("v_")) continue;
    const name = k.slice(2);
    const raw = String(v);
    if (raw === "on") value[name] = true;
    else if (raw !== "" && !Number.isNaN(Number(raw))) value[name] = Number(raw);
    else value[name] = raw.slice(0, 500);
  }

  const { error } = await supabase.from("validation_notes").upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/validation/${eventId}`);
  revalidatePath(`/admin/validation`);
}
