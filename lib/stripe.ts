import Stripe from "stripe";

// Stripeクライアント。STRIPE_SECRET_KEY が未設定の環境(ローカル/未設定のPreview等)では
// null を返し、呼び出し側は決済機能を安全にスキップする(他のAPI連携と同じグレースフルデグレード方針)。
let cachedClient: Stripe | null | undefined;

export function getStripeClient(): Stripe | null {
  if (cachedClient !== undefined) return cachedClient;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    cachedClient = null;
    return null;
  }

  cachedClient = new Stripe(apiKey, {
    apiVersion: "2024-06-20",
  });
  return cachedClient;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function isStripeWebhookConfigured(): boolean {
  return !!process.env.STRIPE_WEBHOOK_SECRET;
}
