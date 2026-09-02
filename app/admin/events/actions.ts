"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/constants";
import { buildEventAnnouncementEmail, sendBatchEmails } from "@/lib/email";
import { EventRow } from "@/lib/types";

function parseEventForm(formData: FormData) {
  return {
    title: String(formData.get("title") || ""),
    event_date: String(formData.get("event_date") || ""),
    start_time: String(formData.get("start_time") || "") || null,
    end_time: String(formData.get("end_time") || "") || null,
    venue: String(formData.get("venue") || ""),
    description: String(formData.get("description") || ""),
    has_afterparty: formData.get("has_afterparty") === "on",
    status: String(formData.get("status") || "upcoming"),
    capacity: formData.get("capacity")
      ? Number(formData.get("capacity"))
      : null,
  };
}

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const payload = parseEventForm(formData);
  const { data, error } = await supabase
    .from("events")
    .insert({ ...payload, created_by: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/events");
  redirect(`/admin/events/${data.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const payload = parseEventForm(formData);

  const { error } = await supabase
    .from("events")
    .update(payload)
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export interface NotifyResult {
  ok: boolean;
  configured: boolean;
  sent: number;
  message: string;
}

export async function notifyEventParticipants(
  eventId: string
): Promise<NotifyResult> {
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
  if (profile?.role !== "admin") throw new Error("管理者権限が必要です");

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (eventError || !event) {
    return {
      ok: false,
      configured: true,
      sent: 0,
      message: "交流会情報の取得に失敗しました。",
    };
  }

  const ev = event as EventRow;

  const { data: participants } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "participant")
    .not("email", "is", null);

  const recipients = (participants || [])
    .map((p) => p.email as string)
    .filter((e): e is string => !!e);

  if (recipients.length === 0) {
    return {
      ok: true,
      configured: true,
      sent: 0,
      message: "通知先の参加者がいませんでした。",
    };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://koryukai-connect.vercel.app";
  const { subject, html } = buildEventAnnouncementEmail({
    title: ev.title,
    eventDateLabel: formatEventDate(ev.event_date),
    timeLabel: ev.start_time
      ? `${ev.start_time.slice(0, 5)}${
          ev.end_time ? `〜${ev.end_time.slice(0, 5)}` : ""
        }`
      : null,
    venue: ev.venue,
    description: ev.description,
    eventUrl: `${appUrl}/events/${ev.id}`,
  });

  const result = await sendBatchEmails(
    recipients.map((to) => ({ to, subject, html }))
  );

  if (!result.configured) {
    return {
      ok: false,
      configured: false,
      sent: 0,
      message:
        "メール送信が未設定です(RESEND_API_KEYが未設定)。運営にご確認ください。",
    };
  }

  await supabase
    .from("events")
    .update({
      notified_at: new Date().toISOString(),
      notified_count: result.sent,
    })
    .eq("id", eventId);

  revalidatePath(`/admin/events/${eventId}`);

  return {
    ok: result.failed === 0,
    configured: true,
    sent: result.sent,
    message:
      result.failed > 0
        ? `${result.sent}件送信、${result.failed}件失敗しました。`
        : `${result.sent}名の参加者にメールを送信しました。`,
  };
}
