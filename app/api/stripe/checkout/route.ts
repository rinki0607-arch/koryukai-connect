import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const NOT_CONFIGURED_MESSAGE =
  "オンライン決済は現在準備中です。参加費のお支払い方法は運営にお問い合わせください。";

export async function POST(req: NextRequest) {
  if (!(await isStripeConfigured())) {
    return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  let eventId = "";
  try {
    const body = await req.json();
    eventId = String(body?.event_id || "");
  } catch {
    return NextResponse.json({ error: "リクエストが不正です。" }, { status: 400 });
  }
  if (!eventId) {
    return NextResponse.json({ error: "event_id が必要です。" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, fee_amount")
    .eq("id", eventId)
    .single();

  if (eventError || !event || !event.fee_amount || event.fee_amount <= 0) {
    return NextResponse.json(
      { error: "この交流会にはオンライン決済の設定がありません。" },
      { status: 400 }
    );
  }

  const { data: registration, error: regError } = await supabase
    .from("registrations")
    .select("id, attending, payment_status, wants_receipt, receipt_name")
    .eq("event_id", eventId)
    .eq("participant_id", user.id)
    .single();

  if (regError || !registration || !registration.attending) {
    return NextResponse.json(
      { error: "先に参加登録フォームを保存してから決済にお進みください。" },
      { status: 400 }
    );
  }

  if (registration.payment_status === "paid") {
    return NextResponse.json({ error: "既にお支払いが完了しています。" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", user.id)
    .single();

  const stripe = await getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://koryukai-connect.vercel.app";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: registration.id,
      customer_email: profile?.email || user.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "jpy",
            // JPYはStripeでは補助単位を持たないゼロ・デシマル通貨のため、円の金額をそのままunit_amountに使う
            unit_amount: event.fee_amount,
            product_data: {
              name: `${event.title} 参加費`,
            },
          },
        },
      ],
      metadata: {
        registration_id: registration.id,
        event_id: eventId,
        participant_id: user.id,
        wants_receipt: registration.wants_receipt ? "true" : "false",
        receipt_name: registration.receipt_name || profile?.name || "",
      },
      success_url: `${appUrl}/events/${eventId}?payment=success`,
      cancel_url: `${appUrl}/events/${eventId}?payment=canceled`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "決済ページの作成に失敗しました。" }, { status: 500 });
    }

    // 決済関連カラムは通常の参加者権限では更新できない(RLSトリガーで保護)ため、
    // service_roleクライアント経由でpending状態に更新する。
    const admin = createAdminClient();
    await admin
      .from("registrations")
      .update({
        payment_status: "pending",
        stripe_checkout_session_id: session.id,
      })
      .eq("id", registration.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `決済セッションの作成に失敗しました: ${err.message}`
            : "決済セッションの作成に失敗しました。",
      },
      { status: 500 }
    );
  }
}
