"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendBatchEmails, buildReEngagementEmail } from "@/lib/email";

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

export async function addAdminNote(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const participantId = String(formData.get("participant_id") || "");
  const note = String(formData.get("note") || "").trim();
  if (!participantId || !note) throw new Error("メモの内容が空です");

  const { error } = await supabase.from("admin_notes").insert({
    participant_id: participantId,
    author_id: user.id,
    note,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/participants/${participantId}`);
}

export async function deleteAdminNote(noteId: string, participantId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("admin_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/participants/${participantId}`);
}

export async function sendReEngagementEmails(participantIds: string[]) {
  const { supabase } = await requireAdmin();

  if (participantIds.length === 0) {
    return { configured: true, sent: 0, failed: 0 };
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, email")
    .in("id", participantIds);

  const targets = (profiles || []).filter(
    (p): p is { id: string; name: string | null; email: string } => !!p.email
  );

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://koryukai-connect.vercel.app";

  const emails = targets.map((p) => {
    const { subject, html } = buildReEngagementEmail({ name: p.name, appUrl });
    return { to: p.email, subject, html };
  });

  const result = await sendBatchEmails(emails);
  revalidatePath("/admin/participants");
  return result;
}
