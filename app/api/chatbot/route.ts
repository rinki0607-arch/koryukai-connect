import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-3-5-haiku-20241022";
const MAX_HISTORY = 12;
const NOT_CONFIGURED_REPLY =
  "現在AIチャットボットの設定準備中のため、自動応答できません。お問い合わせは交流会当日の運営スタッフ、またはアプリ内の各ページの案内をご確認のうえ、運営までご連絡ください。";
const BUSY_REPLY =
  "只今AIチャットボットが混み合っているか、一時的にご利用いただけません。少し時間をおいて再度お試しください。";

const SYSTEM_PROMPT_BASE = `あなたは「ARKIVE」というWebアプリ内に設置されたAIチャットボットです。
ARKIVEは、ヒューマンキャピタル株式会社が運営する「アーク起業塾」の月例交流会(ネットワーキングイベント)の
参加登録・プロフィール管理・当日のQR受付・マッチング・メッセージ機能をまとめたプラットフォームです。

【アーク起業塾・ARKIVEについて、あなたが知っている事実】
- 運営: ヒューマンキャピタル株式会社
- コンセプト: 「人的資本(人と人とのつながり)を大切にする」。交流会で生まれたつながりを一度きりで終わらせず、
  記録・資産として積み重ねていくためにARKIVEが作られた。
- 開催形式: 月例の交流会(ネットワーキングイベント)。二次会が設定されている回もある。
- 参加者ができること: 交流会一覧の閲覧と参加登録(参加可否・二次会参加希望可否・業種・繋がりたい人を入力)、
  マイページでのプロフィール編集(名前・会社名・役職・職種・業種・電話番号・自己紹介など)、
  マイQRコードによる当日の入退場受付、参加者名簿の閲覧、他の参加者への「話してみたい」の意思表示、
  お互いに「話してみたい」を選ぶと成立する「マッチング」、マッチした相手とのアプリ内チャット
  (会話は相手ごとに、複数の交流会をまたいでずっと履歴が残る)。
- マイページの「あなたの人的資本」では、参加した交流会数・つながった人数・交わしたメッセージ数などが確認できる。
- アカウント登録は誰でもメールアドレスとパスワードで無料でできる。新規登録したアカウントは初期状態では
  「参加者」ロールで、管理画面には入れない。
- 業種は約30種類の選択肢(IT・ソフトウェア開発、コンサルティング、金融、医療、建設、飲食など)から選べるほか
  自由入力も可能。
- 電話番号は運営からの緊急連絡のみに使われ、他の参加者や名簿には公開されない。メールアドレスもマッチング成立
  前は非公開。
- スマホへの追加はアプリストアを経由せず、/install ページのQRコードやブラウザの「ホーム画面に追加」機能で
  行える(必須ではなく、ブラウザからのアクセスでも全く同じように使える)。
- QRコードの読み取りがうまくいかない場合は画面の明るさを上げて再度提示する。改善しない場合は運営スタッフへ。

【回答のルール】
- 上記の事実および、この後に続く「直近の開催予定」の情報に基づいて、簡潔に(数文程度で)日本語で回答してください。
  ユーザーが日本語以外で質問した場合はその言語で回答してください。
- ARKIVEおよびアーク起業塾に関係のない質問(一般的な雑談、他社サービス、コーディングの相談など)には、
  やんわりと「ARKIVE・アーク起業塾に関するご質問にお答えするチャットボットです」と伝え、深入りしないでください。
- あなたはAIによる自動応答であり、特定の会員個人の登録状況・参加履歴・パスワードなどの個人情報には
  アクセスできません。それらの質問には「ログイン後のマイページをご確認いただくか、運営スタッフに直接
  お問い合わせください」と案内してください。存在しない連絡先(メールアドレスや電話番号)を絶対に作り出さないでください。
- 開催日程や会場について、以下の「直近の開催予定」に記載のない回については、正確な情報を持っていない旨を
  正直に伝え、憶測で日付や内容を答えないでください。
- 参加費・キャンセル規定・individual な契約条件など、あなたが確証を持てない事項については断定せず、
  「運営にご確認ください」と案内してください。
- 常に丁寧で親しみやすいトーンを保ちつつ、簡潔に。長文の説明や箇条書きの乱用は避けてください。`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ configured: false, reply: NOT_CONFIGURED_REPLY });
  }

  let messages: ChatMessage[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.messages)) {
      messages = body.messages
        .filter(
          (m: unknown): m is ChatMessage =>
            !!m &&
            typeof m === "object" &&
            (m as ChatMessage).role &&
            ["user", "assistant"].includes((m as ChatMessage).role) &&
            typeof (m as ChatMessage).content === "string" &&
            (m as ChatMessage).content.trim().length > 0 &&
            (m as ChatMessage).content.length < 4000
        )
        .slice(-MAX_HISTORY);
    }
  } catch {
    return NextResponse.json({ configured: true, reply: BUSY_REPLY }, { status: 400 });
  }

  if (messages.length === 0) {
    return NextResponse.json({ configured: true, reply: BUSY_REPLY }, { status: 400 });
  }

  let eventsBlock = "現在、公開されている開催予定の情報はありません。";
  try {
    const supabase = await createClient();
    const { data: events } = await supabase.rpc("get_upcoming_events_public");
    if (Array.isArray(events) && events.length > 0) {
      eventsBlock = events
        .map((e) => {
          const date = e.event_date as string;
          const time = e.start_time ? ` ${String(e.start_time).slice(0, 5)}〜` : "";
          const venue = e.venue ? ` / 会場: ${e.venue}` : "";
          const desc = e.description ? ` / ${e.description}` : "";
          return `- ${e.title}(${date}${time})${venue}${desc}`;
        })
        .join("\n");
    }
  } catch {
    // ライブ情報の取得に失敗しても、既知の一般情報だけでチャットボットは動作を継続する
  }

  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n【直近の開催予定(自動更新・ここに無い回は把握していません)】\n${eventsBlock}`;

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
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ configured: true, reply: BUSY_REPLY });
    }

    const data = await res.json();
    const reply =
      Array.isArray(data?.content) && data.content[0]?.text
        ? String(data.content[0].text)
        : BUSY_REPLY;

    return NextResponse.json({ configured: true, reply });
  } catch {
    return NextResponse.json({ configured: true, reply: BUSY_REPLY });
  }
}
