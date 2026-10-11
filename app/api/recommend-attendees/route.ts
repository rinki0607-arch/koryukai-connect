import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, extractJson, isAiConfigured } from "@/lib/ai";
import { AttendeeCandidate, AttendeeRecommendation } from "@/lib/types";
import { memberCategoryLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

const NOT_CONFIGURED_MESSAGE = "AIによるおすすめ表示は現在準備中です。";

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  let eventId = "";
  try {
    const body = await req.json();
    eventId = String(body?.eventId || "");
  } catch {
    return NextResponse.json({ error: "リクエストが不正です。" }, { status: 400 });
  }
  if (!eventId) {
    return NextResponse.json({ error: "eventId が必要です。" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { data: myReg } = await supabase
    .from("registrations")
    .select("goal_text, connect_with, industry, attending")
    .eq("event_id", eventId)
    .eq("participant_id", user.id)
    .maybeSingle();

  if (!myReg || !myReg.attending) {
    return NextResponse.json(
      { error: "この交流会に「参加する」で登録してから利用できます。" },
      { status: 400 }
    );
  }

  const { data: attendeesData, error: attendeesError } = await supabase.rpc(
    "get_event_attendees",
    { p_event_id: eventId }
  );
  if (attendeesError) {
    return NextResponse.json({ error: attendeesError.message }, { status: 400 });
  }
  const attendees = (attendeesData as AttendeeCandidate[]) || [];

  if (attendees.length === 0) {
    return NextResponse.json({ recommendations: [] satisfies AttendeeRecommendation[] });
  }

  const goalText = (myReg.goal_text || "").trim();
  const connectWith = (myReg.connect_with || "").trim();

  if (!goalText && !connectWith) {
    // ゴール未入力の場合はAIを呼ばず、既存のmatch_score上位をそのまま使う
    const top = [...attendees]
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 3)
      .map((a) => ({
        participant_id: a.participant_id,
        reason: "タグ・業種が近い参加者です",
      }));
    return NextResponse.json({ recommendations: top });
  }

  const candidateLines = attendees
    .slice(0, 60)
    .map((a) => {
      const parts = [
        `id=${a.participant_id}`,
        `name=${a.name || "匿名"}`,
        a.company ? `company=${a.company}` : null,
        a.industry ? `industry=${a.industry}` : null,
        memberCategoryLabel(a.member_category) !== "一般参加者"
          ? `属性=${memberCategoryLabel(a.member_category)}`
          : null,
        a.investor_mentor_note ? `support=${a.investor_mentor_note}` : null,
        a.goal_text ? `today_goal=${a.goal_text}` : null,
        a.connect_with ? `connect_with=${a.connect_with}` : null,
      ].filter(Boolean);
      return parts.join(", ");
    })
    .join("\n");

  const prompt = `あなたは日本のビジネス交流会アプリ「ARKIVE」のマッチングアシスタントです。
今回の参加者のうち、依頼者が今日会うべき3名を選び、日本語で理由とともに提案してください。

【依頼者が今回の交流会で相談したいこと・会いたい人】
${goalText || connectWith || "(未入力)"}

【参加者一覧(1行1名)】
${candidateLines}

【条件】
- 必ず上記一覧に実在する id のみを選ぶこと(新しいidを作らない)
- 依頼者のゴールとの関連性が高い順に最大3名を選ぶ
- 各理由は30〜50文字程度、具体的な理由にする
- 出力は次のJSON形式のみ。説明文は一切つけない。
[{"participant_id": "...", "reason": "..."}, {"participant_id": "...", "reason": "..."}, {"participant_id": "...", "reason": "..."}]`;

  try {
    const raw = await callClaude({ prompt, maxTokens: 700 });
    const parsed = extractJson<AttendeeRecommendation[]>(raw);
    const validIds = new Set(attendees.map((a) => a.participant_id));
    const recommendations = (parsed || [])
      .filter(
        (r): r is AttendeeRecommendation =>
          !!r && typeof r.participant_id === "string" && validIds.has(r.participant_id)
      )
      .slice(0, 3)
      .map((r) => ({
        participant_id: r.participant_id,
        reason: typeof r.reason === "string" && r.reason.trim() ? r.reason.trim() : "おすすめの参加者です",
      }));

    if (recommendations.length === 0) {
      const top = [...attendees]
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 3)
        .map((a) => ({
          participant_id: a.participant_id,
          reason: "タグ・業種が近い参加者です",
        }));
      return NextResponse.json({ recommendations: top });
    }

    return NextResponse.json({ recommendations });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "おすすめの生成に失敗しました。",
      },
      { status: 500 }
    );
  }
}
