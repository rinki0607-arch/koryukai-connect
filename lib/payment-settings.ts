import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe決済のシークレットキー・Webhook署名シークレットを、Vercelの環境変数ではなく
 * アプリ内(管理画面)から設定・保存できるようにするためのヘルパー。
 *
 * 背景: このアプリの運営代表は決済のAPIキー設定そのものには関与せず、
 * 事務局(admin権限を持つ運営メンバー)がStripeのアカウント作成〜キー取得〜登録までを
 * すべてアプリの中だけで完結できるようにしたい、という要望に基づく。
 *
 * 値は public.payment_settings テーブルに保存する。このテーブルはRLSを有効にしたまま
 * authenticated向けのポリシーを一切作成していないため、通常のSupabaseクライアントからは
 * 一切読み書きできない。必ずこのファイルの関数を経由し、その中で
 * (a) ログイン済みで (b) role='admin' であることを確認したうえで、
 * service_roleクライアント(lib/supabase/admin.ts)を使ってアクセスする。
 *
 * このファイルはサーバー専用コード(Server Component / Server Action / Route Handler)
 * からのみ呼び出すこと。クライアントコンポーネントから直接importしてはいけない。
 */

export type PaymentSettingsStatus = {
  stripeConfigured: boolean;
  webhookConfigured: boolean;
  secretKeyPreview: string | null;
  webhookSecretPreview: string | null;
  updatedAt: string | null;
  updatedByName: string | null;
  envOverride: boolean; // Vercelの環境変数(STRIPE_SECRET_KEY)が優先されている場合true
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("ログインが必要です。");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("この操作には運営権限が必要です。");
  }

  return user;
}

function maskKey(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.length <= 10) return "••••••••";
  return `${key.slice(0, 7)}${"•".repeat(6)}${key.slice(-4)}`;
}

export async function getPaymentSettingsStatus(): Promise<PaymentSettingsStatus> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data } = await admin
    .from("payment_settings")
    .select("stripe_secret_key, stripe_webhook_secret, updated_at, updated_by")
    .eq("id", true)
    .maybeSingle();

  let updatedByName: string | null = null;
  if (data?.updated_by) {
    const { data: p } = await admin
      .from("profiles")
      .select("name")
      .eq("id", data.updated_by)
      .single();
    updatedByName = p?.name || null;
  }

  const envSecretKey = process.env.STRIPE_SECRET_KEY || null;
  const envWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;

  return {
    stripeConfigured: !!envSecretKey || !!data?.stripe_secret_key,
    webhookConfigured: !!envWebhookSecret || !!data?.stripe_webhook_secret,
    secretKeyPreview: maskKey(envSecretKey || data?.stripe_secret_key),
    webhookSecretPreview: maskKey(envWebhookSecret || data?.stripe_webhook_secret),
    updatedAt: data?.updated_at ?? null,
    updatedByName,
    envOverride: !!envSecretKey || !!envWebhookSecret,
  };
}

export async function saveStripeCredentials(input: {
  secretKey?: string;
  webhookSecret?: string;
}): Promise<void> {
  const user = await requireAdmin();
  const admin = createAdminClient();

  const secretKey = input.secretKey?.trim();
  const webhookSecret = input.webhookSecret?.trim();

  if (secretKey && !secretKey.startsWith("sk_")) {
    throw new Error(
      "シークレットキーの形式が正しくないようです(sk_で始まる文字列を入力してください)。"
    );
  }
  if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
    throw new Error(
      "Webhook署名シークレットの形式が正しくないようです(whsec_で始まる文字列を入力してください)。"
    );
  }

  const { data: existing } = await admin
    .from("payment_settings")
    .select("stripe_secret_key, stripe_webhook_secret")
    .eq("id", true)
    .maybeSingle();

  // 空欄で送信された場合は既存の値を維持する(再入力の手間を省くため、
  // 保存済みの値は画面にマスク表示のみで、生の値は再送しない設計にしている)。
  const nextSecretKey = secretKey || existing?.stripe_secret_key || null;
  const nextWebhookSecret = webhookSecret || existing?.stripe_webhook_secret || null;

  const { error } = await admin.from("payment_settings").upsert({
    id: true,
    stripe_secret_key: nextSecretKey,
    stripe_webhook_secret: nextWebhookSecret,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`保存に失敗しました: ${error.message}`);
  }
}

export async function clearStripeCredentials(): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("payment_settings").delete().eq("id", true);
  if (error) {
    throw new Error(`削除に失敗しました: ${error.message}`);
  }
}
