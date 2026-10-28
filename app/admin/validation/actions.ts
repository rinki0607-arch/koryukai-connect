"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 仮説検証ダッシュボード(運営専用)の書き込み。RLSで管理者のみ更新できる。

const FLAG_FIELDS = ["intro_sent_at", "interview_done_at", "enrolled_at"] as const;
type FlagField = (typeof FLAG_FIELDS)[number];

export async function toggleRegistrationFlag(formData: FormData) {
  const registrationId = String(formData.get("registration_id") || "");
  const field = String(formData.get("field") || "") as FlagField;
  const eventId = String(formData.get("event_id") || "");
  const on = formData.get("on") === "1";
  if (!registrationId || !FLAG_FIELDS.includes(field)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("registrations")
    .update({ [field]: on ? new Date().toISOString() : null })
    .eq("id", registrationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/validation/${eventId}`);
}

export async function saveValidationNote(formData: FormData) {
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
