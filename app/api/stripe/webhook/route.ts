import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripe = await getStripeClient();
  const webhookSecret = await getStripeWebhookSecret();

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("missing stripe-signature header");
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      {
        error: `signature verification failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const registrationId = session.client_reference_id || session.metadata?.registration_id;

    if (registrationId) {
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;

      let receiptUrl: string | null = null;
      if (paymentIntentId) {
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ["latest_charge"],
          });
          const charge = pi.latest_charge;
          if (charge && typeof charge !== "string") {
            receiptUrl = charge.receipt_url || null;
          }
        } catch {
          // 領収書URLの取得に失敗しても決済記録自体は続行する(後で管理画面から手動確認可能)
        }
      }

      const admin = createAdminClient();
      await admin
        .from("registrations")
        .update({
          payment_status: "paid",
          stripe_payment_intent_id: paymentIntentId,
          paid_amount: session.amount_total ?? null,
          paid_at: new Date().toISOString(),
          receipt_url: receiptUrl,
        })
        .eq("id", registrationId);
    }
  }

  return NextResponse.json({ received: true });
}
