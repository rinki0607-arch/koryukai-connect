// 新着交流会のメール通知
// 送信には Resend (https://resend.com) の API キーが必要です。
// Vercel の環境変数 RESEND_API_KEY が未設定の場合は何もせず、その旨を呼び出し側に返します。

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendBatchResult {
  configured: boolean;
  sent: number;
  failed: number;
  error?: string;
}

const RESEND_API_URL = "https://api.resend.com/emails/batch";

export async function sendBatchEmails(
  emails: SendEmailInput[]
): Promise<SendBatchResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ARKIVE <onboarding@resend.dev>";

  if (!apiKey) {
    return {
      configured: false,
      sent: 0,
      failed: 0,
      error:
        "RESEND_API_KEY が設定されていないため、メール送信はスキップされました。",
    };
  }

  if (emails.length === 0) {
    return { configured: true, sent: 0, failed: 0 };
  }

  // Resend のバッチ送信は1リクエストあたり最大100件まで
  const chunks: SendEmailInput[][] = [];
  for (let i = 0; i < emails.length; i += 100) {
    chunks.push(emails.slice(i, i + 100));
  }

  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;

  for (const chunk of chunks) {
    try {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          chunk.map((e) => ({
            from,
            to: [e.to],
            subject: e.subject,
            html: e.html,
          }))
        ),
      });

      if (res.ok) {
        sent += chunk.length;
      } else {
        failed += chunk.length;
        lastError = `Resend API error (${res.status}): ${await res
          .text()
          .catch(() => "")}`;
      }
    } catch (err) {
      failed += chunk.length;
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { configured: true, sent, failed, error: lastError };
}

export function buildEventAnnouncementEmail(params: {
  title: string;
  eventDateLabel: string;
  timeLabel: string | null;
  venue: string | null;
  description: string | null;
  eventUrl: string;
}) {
  const { title, eventDateLabel, timeLabel, venue, description, eventUrl } =
    params;

  const subject = `【ARKIVE】新しい交流会のお知らせ:${title}`;

  const html = `
    <div style="font-family:sans-serif;line-height:1.7;color:#1a1a2e;max-width:480px;margin:0 auto;">
      <p style="font-size:12px;color:#4f46e5;font-weight:bold;letter-spacing:.05em;">ARKIVE / アーク起業塾</p>
      <h2 style="margin:8px 0 4px;">新しい交流会のお知らせ</h2>
      <p style="margin:0 0 20px;color:#555;">${eventDateLabel}${
    timeLabel ? ` ${timeLabel}` : ""
  }に「${title}」を開催します。</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:6px 0;color:#888;font-size:13px;">開催日</td><td style="padding:6px 0;font-size:13px;">${eventDateLabel}</td></tr>
        ${
          timeLabel
            ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;">時間</td><td style="padding:6px 0;font-size:13px;">${timeLabel}</td></tr>`
            : ""
        }
        ${
          venue
            ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;">会場</td><td style="padding:6px 0;font-size:13px;">${venue}</td></tr>`
            : ""
        }
      </table>
      ${
        description
          ? `<p style="white-space:pre-wrap;color:#333;font-size:14px;">${description}</p>`
          : ""
      }
      <a href="${eventUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">参加登録する</a>
      <p style="margin-top:28px;font-size:12px;color:#999;">このメールはARKIVEにご登録いただいた方に送信しています。</p>
    </div>
  `;

  return { subject, html };
}
