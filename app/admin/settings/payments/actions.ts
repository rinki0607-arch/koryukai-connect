"use server";

import { revalidatePath } from "next/cache";
import { saveStripeCredentials, clearStripeCredentials } from "@/lib/payment-settings";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveStripeSettingsAction(formData: FormData): Promise<ActionResult> {
  const secretKey = String(formData.get("secret_key") || "");
  const webhookSecret = String(formData.get("webhook_secret") || "");

  if (!secretKey && !webhookSecret) {
    return { ok: false, error: "シークレットキーまたはWebhook署名シークレットを入力してください。" };
  }

  try {
    await saveStripeCredentials({ secretKey, webhookSecret });
    revalidatePath("/admin/settings/payments");
    revalidatePath("/admin/revenue");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存に失敗しました。" };
  }
}

export async function clearStripeSettingsAction(): Promise<ActionResult> {
  try {
    await clearStripeCredentials();
    revalidatePath("/admin/settings/payments");
    revalidatePath("/admin/revenue");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "削除に失敗しました。" };
  }
}
