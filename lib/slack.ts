// 通報・問い合わせのSlack通知。
// SLACK_WEBHOOK_URL(Incoming Webhook)が未設定の環境では何もせず、安全にスキップする。

export interface SlackNotifyResult {
  configured: boolean;
  ok: boolean;
  error?: string;
}

export async function sendSlackMessage(text: string): Promise<SlackNotifyResult> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return { configured: false, ok: false, error: "SLACK_WEBHOOK_URL が未設定です。" };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      return {
        configured: true,
        ok: false,
        error: `Slack Webhook error (${res.status}): ${await res.text().catch(() => "")}`,
      };
    }
    return { configured: true, ok: true };
  } catch (err) {
    return {
      configured: true,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function buildSupportInquirySlackMessage(params: {
  kind: "report" | "contact";
  summary: string;
  details: string | null;
  contactName: string | null;
  contactEmail: string | null;
  isBusinessHours: boolean;
  adminUrl: string;
}) {
  const { kind, summary, details, contactName, contactEmail, isBusinessHours, adminUrl } =
    params;

  const emoji = kind === "report" ? "🚨" : "💬";
  const kindLabel = kind === "report" ? "通報" : "問い合わせ";
  const urgency = isBusinessHours
    ? "営業時間内に届きました。速やかにご確認ください。"
    : "営業時間外に届きました(次の営業日以降の対応でOKです)。";
  const contactLine = `${contactName || "(名前未取得)"}${
    contactEmail ? ` / ${contactEmail}` : " / (メールアドレス未取得)"
  }`;

  const lines = [
    `${emoji} *ARKIVE ${kindLabel}が届きました*`,
    `> ${urgency}`,
    `*要約*: ${summary}`,
  ];
  if (details) lines.push(`*詳細*: ${details}`);
  lines.push(`*連絡先*: ${contactLine}`);
  lines.push(`<${adminUrl}|管理画面で確認する>`);

  return lines.join("\n");
}
