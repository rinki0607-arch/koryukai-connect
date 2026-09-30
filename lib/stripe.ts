import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripeの秘密鍵・Webhook署名シークレットの取得元(2026-09-30 更新):
// 1. まず環境変数(STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET)を優先的に参照する。
// 2. 未設定の場合は、事務局が管理画面(/admin/settings/payments)から保存した
//    public.payment_settings テーブルの値にフォールバックする。
// これにより、Vercelの環境変数を一切触れない事務局スタッフでも、アプリ内だけで
// Stripe連携を完結できるようにしている(他のAPI連携と同じグレースフルデグレード方針)。
//
// DB側の値は管理画面からいつでも更新され得るため、モジュールレベルでのキャッシュは行わない
// (キャッシュすると再デプロイするまで新しい設定が反映されなくなってしまう)。

async function loadCredentials(): Promise<{
  secretKey: string | null;
  webhookSecret: string | null;
}> {
  const envSecretKey = process.env.STRIPE_SECRET_KEY || null;
  const envWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;

  if (envSecretKey && envWebhookSecret) {
    return { secretKey: envSecretKey, webhookSecret: envWebhookSecret };
  }

  let dbSecretKey: string | null = null;
  let dbWebhookSecret: string | null = null;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("payment_settings")
      .select("stripe_secret_key, stripe_webhook_secret")
      .eq("id", true)
      .maybeSingle();
    dbSecretKey = data?.stripe_secret_key || null;
    dbWebhookSecret = data?.stripe_webhook_secret || null;
  } catch {
    // payment_settings テーブルがまだ存在しない環境(マイグレーション未適用)では
    // 黙ってスキップし、環境変数だけの結果を返す。
  }

  return {
    secretKey: envSecretKey || dbSecretKey,
    webhookSecret: envWebhookSecret || dbWebhookSecret,
  };
}

export async function getStripeClient(): Promise<Stripe | null> {
  const { secretKey } = await loadCredentials();
  if (!secretKey) return null;

  return new Stripe(secretKey, {
    apiVersion: "2024-06-20",
  });
}

export async function isStripeConfigured(): Promise<boolean> {
  const { secretKey } = await loadCredentials();
  return !!secretKey;
}

export async function isStripeWebhookConfigured(): Promise<boolean> {
  const { webhookSecret } = await loadCredentials();
  return !!webhookSecret;
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const { webhookSecret } = await loadCredentials();
  return webhookSecret;
}
