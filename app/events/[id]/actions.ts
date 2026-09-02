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
  const saveAsDefault = formData.get("save_as_default") === "on";

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
