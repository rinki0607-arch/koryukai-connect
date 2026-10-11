import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, extractJson, isAiConfigured } from "@/lib/ai";
import { ConversationPartner, IcebreakerSuggestion, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

const NOT_CONFIGURED_MESSAGE = "AIによる話題提案は現在準備中です。";

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  let partnerId = "";
  try {
    const body = await req.json();
    partnerId = String(body?.partnerId || "");
  } catch {
    return NextResponse.json({ error: "リクエストが不正です。" }, { status: 400 });
  }
  if (!partnerId) {
    return NextResponse.json({ error: "partnerId が必要です。" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  // get_conversation_partner はマッチ済みの相手にしか行を返さないため、
  // これ自体が「本当にマッチしている相手か」の認可チェックを共ねる。
  const { data: partnerRows } = await supabase.rpc("get_conversation_partner", {
    partner: partnerId,
  });
  const partner = (partnerRows as ConversationPartner[] | null)?.[0];
  if (!partner) {
    return NextResponse.json(
      { error: "この相手とはマッチしていません。" },
      { status: 403 }
    );
  }

  const { data: myProfileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const me = myProfileData as Profile | null;

  const prompt = `あなたは日本のビジネス交流会アプリ「ARKIVE」のアシスタントです。
マッチが成立した2人が初めて会話を始める際の、自然な一言目のメッセージ案を3つ考えてください。

【自分のプロフィール】
名前: ${me?.name || "不明"}
会社・役職: ${[me?.company, me?.job_title].filter(Boolean).join(" / ") || "不明"}
業種: ${me?.industry || "不明"}
繋がりたい人・興味: ${me?.connect_with || "特になし"}

【相手のプロフィール】
名前: ${partner.name || "不明"}
会社・役職: ${[partner.company, partner.job_title].filter(Boolean).join(" / ") || "不明"}
業種: ${partner.industry || "不明"}
相手が繋がりたい人・興味: ${partner.connect_with || "特になし"}

【条件】
- 日本語の丁寧だが堅すぎない文体(敬語・絵文字は控えめに1つ程度まで)
- 1件あたり80文字以内
- 具体的な共通点や相手の興味に触れ、質問で終わるなど返信しやすい内容にする
- 出力は次のJSON形式のみ。説明文は一切つけない。
{"suggestions": ["案1", "案2", "案3"]}`;

  try {
    const raw = await callClaude({ prompt, maxTokens: 500 });
    const parsed = extractJson<IcebreakerSuggestion>(raw);
    const suggestions = (parsed?.suggestions || []).filter(
      (s): s is string => typeof s === "string" && s.trim().length > 0
    );
    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: "話題の提案を生成できませんでした。もう一度お試しください。" },
        { status: 502 }
      );
    }
    return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "話題の提案に失敗しました。",
      },
      { status: 500 }
    );
  }
}
