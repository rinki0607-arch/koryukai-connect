"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
