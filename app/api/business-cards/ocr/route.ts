import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

const EXTRACT_CARD_TOOL = {
  name: "extract_business_card",
  description:
    "名刺の画像から読み取れた情報を構造化して返す。読み取れなかった項目は空文字にする。憶測で埋めないこと。",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "氏名" },
      company: { type: "string", description: "会社名・組織名" },
      job_title: { type: "string", description: "役職" },
      phone: { type: "string", description: "電話番号" },
      email: { type: "string", description: "メールアドレス" },
    },
    required: ["name", "company", "job_title", "phone", "email"],
  },
};

const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OCR機能は現在準備中です(APIキー未設定)。手動で入力してください。" },
      { status: 503 }
    );
  }

  let mediaType = "";
  let base64Data = "";
  try {
    const body = await req.json();
    mediaType = String(body?.media_type || "");
    base64Data = String(body?.data || "");
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  if (!ALLOWED_MEDIA_TYPES.has(mediaType) || !base64Data) {
    return NextResponse.json({ error: "画像形式が不正です" }, { status: 400 });
  }
  // 大まかなサイズ上限(base64換算で約8MB)。名刺写真として十分な余裕を持たせつつ暴走を防ぐ。
  if (base64Data.length > 8_000_000) {
    return NextResponse.json({ error: "画像サイズが大きすぎます" }, { status: 400 });
  }

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        tool_choice: { type: "tool", name: "extract_business_card" },
        tools: [EXTRACT_CARD_TOOL],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64Data },
              },
              {
                type: "text",
                text: "この名刺画像から氏名・会社名・役職・電話番号・メールアドレスを読み取ってください。",
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "読み取りに失敗しました。時間をおいて再度お試しください。" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const toolBlock = Array.isArray(data?.content)
      ? data.content.find((b: { type?: string }) => b.type === "tool_use")
      : null;

    if (!toolBlock?.input) {
      return NextResponse.json(
        { error: "名刺の情報を読み取れませんでした。手動で入力してください。" },
        { status: 422 }
      );
    }

    const input = toolBlock.input as Record<string, unknown>;
    return NextResponse.json({
      name: String(input.name || ""),
      company: String(input.company || ""),
      job_title: String(input.job_title || ""),
      phone: String(input.phone || ""),
      email: String(input.email || ""),
    });
  } catch {
    return NextResponse.json(
      { error: "読み取りに失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
