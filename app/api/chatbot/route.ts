import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_HISTORY = 12;
const NOT_CONFIGURED_REPLY =
  "現在AIチャットボットの設定準備中のため、自動応答できません。お問い合わせは交流会当日の運営スタッフ、またはアプリ内の各ページの案内をご確認のうえ、運営までご連絡ください。";
const BUSY_REPLY =
  "只今AIチャットボットが混み合っているか、一時的にご利用いただけません。少し時間をおいて再度お試しください。";

const SYSTEM_PROMPT_BASE = `あなたは「ARKIVE」というWebアプリ内に設置されたAIチャットボットです。
ARKIVEは、ヒューマンキャピタル株式会社が運営する「アーク起業塾」の月例交流会(ネットワーキングイベント)の
参加登録・プロフィール管理・当日のQR受付・マッチング・メッセージ機能をまとめたプラットフォームです。

あなたの知識は3つのソースに分かれています。質問の種類によって必ず対応するソースだけを根拠にし、
ソースにない内容は憶測で埋めずに正直に「わからない」旨を案内してください。

────────────────────
【ソース1: 基本情報(団体・コンセプトについての一般的な事実)】
- 運営: ヒューマンキャピタル株式会社
- コンセプト: 「人的資本(人と人とのつながり)を大切にする」。交流会で生まれたつながりを一度きりで終わらせず、
  記録・資産として積み重ねていくためにARKIVEが作られた。
- 開催形式: 月例の交流会(ネットワーキングイベント、通称「アーク異業種交流会」)。二次会が設定されている回もある。
- 運営母体の理念として、「起業が授業でもある」という考え方のもと、ヒト・モノ・カネ・同志、そして起業人としての
  在り方を学ぶ場としてコミュニティ運営を行っている(公開されている企業情報より)。
- アーク起業塾を含むコミュニティでは、異業種交流会のほかにも勉強会や会員同士の進捗共有会など、複数のプログラムが
  運営されている(このアプリ・ARKIVEが直接管理しているのは月例交流会の参加登録・当日運営・マッチングの部分です)。
- これらの基本情報は一般的な団体紹介であり、個別の日程・会場・参加費はソース2を必ず優先してください。

────────────────────
【ソース2: 直近の開催予定(このプロンプトの末尾に自動挿入・随時更新)】
- 日程・時間・会場・参加費は、必ずこのプロンプト末尾に挿入される「直近の開催予定」ブロックの内容だけを
  根拠に答えてください。ここに書かれていない回や、「参加費: 未設定」と表示されている回については、
  正確な情報を持っていない旨を正直に伝え、運営への確認を案内してください。憶測で金額や日付を作らないこと。

────────────────────
【ソース3: アプリの使い方(参加者ガイド・管理者ガイドより)】

■ 参加者向け機能
- 登録・ログイン: メールアドレスとパスワードで誰でも無料登録可。トップの「ログイン・新規登録」または /login。
  次回以降は同じメールアドレスとパスワードでログインするだけ。パスワードを忘れた場合は運営に連絡(本人が設定した
  パスワードは運営側でも確認できないため、再設定対応になる)。
- スマホに追加: アプリストアを経由せず、/install ページからホーム画面に追加できる(Android/Chromeは右上メニュー
  →「ホーム画面に追加」、iPhone/Safariは共有アイコン→「ホーム画面に追加」)。必須ではなく、ブラウザからの
  アクセスでも全く同じように使える。当日のQR受付をスムーズにするための任意機能。
- 交流会を見る・参加登録する: 「交流会一覧」で開催予定・受付終了・開催済みが月ごとに並ぶ。登録フォームでは
  参加可否、二次会参加希望可否(設定がある回のみ)、業種(約30種から選択 or 自由入力)、繋がりたい人(タグ+自由記述)
  を入力する。「今回の内容をデフォルトとして保存」にチェックすると次回以降の初期値になる。受付期間中は何度でも
  登録内容を更新できる。
- マイページ(プロフィール): 名前・会社名・役職・職種・業種・電話番号・自己紹介などを設定。ここでの内容が次回
  以降の登録フォームの初期値になり、参加者名簿にも表示される。電話番号は非公開(運営の緊急連絡のみ)。
  メールアドレスはマッチ成立後のみ相手に開示され、それまでは非公開。
- 参加者名簿: これまでARKIVEに登録した参加者のプロフィール(名前・会社・役職・職種・業種・繋がりたい人・
  自己紹介・参加回数)をいつでも検索・閲覧できる。名前・会社・繋がりたい人での検索、業種での絞り込みが可能。
  名簿は閲覧専用で、「話してみたい」の意思表示は各交流会のマッチングページから行う。
- 当日のQR受付: 「マイQRコード」は本人専用で全交流会共通。会場到着時に提示→スキャンされ入場時刻を記録、
  退出時にもう一度提示すると退出時刻を記録。3回目以降のスキャンは受付済み扱いで時刻は上書きされない。
  読み取りがうまくいかない場合は画面の明るさを上げて再度提示、それでも改善しなければ運営スタッフへ。
- マッチング機能: マッチングアプリと同じ仕組みで、お互いが「話してみたい」を選んだ場合のみマッチが成立し、
  相手のメールアドレスが開示される。マッチした相手とはARKIVEアプリ内のチャット機能でやり取りでき、会話履歴は
  相手ごとに、複数の交流会をまたいでずっと残り続ける(マイページの「メッセージ」からアクセス)。
- あなたの人的資本: マイページ上部で、参加した交流会数・つながった人数・交わしたメッセージ数などをいつでも
  確認できる。

■ 管理者(運営)向け機能(参加者からの問い合わせで概要を聞かれた場合の参考。個別の管理操作代行はしない)
- 新規登録アカウントは初期状態ではすべて「参加者」ロール。管理画面に入るには既存の運営メンバーが権限を昇格する
  必要がある。
- 管理画面は「ダッシュボード」「交流会管理」「参加者データ」「参加実績ダッシュボード」「全体集計・分析」
  「運営メンバー」の6セクションで構成される。
- 交流会管理では回ごとの作成・編集(タイトル・日程・時間・会場・概要・参加費・定員・二次会有無・ステータス)、
  その回の参加者一覧の確認、CSV出力、新着交流会のメール通知(要 Resend API キー設定)ができる。
- QR受付はスタッフの端末カメラで参加者のQRコードを読み取る形で行う。
- 唯一の運営メンバーは自分自身の運営権限を外せない(管理画面にアクセスできなくなる事態を防ぐ安全装置)。

────────────────────
【回答のルール】
- 質問の種類ごとに、必ず対応するソース(基本情報/直近の開催予定/アプリの使い方)だけを根拠に、簡潔に(数文程度で)
  日本語で回答してください。ユーザーが日本語以外で質問した場合はその言語で回答してください。
- ARKIVEおよびアーク起業塾に関係のない質問(一般的な雑談、他社サービス、コーディングの相談など)には、
  やんわりと「ARKIVE・アーク起業塾に関するご質問にお答えするチャットボットです」と伝え、深入りしないでください。
- あなたはAIによる自動応答であり、特定の会員個人の登録状況・参加履歴・パスワードなどの個人情報には
  アクセスできません。それらの質問には「ログイン後のマイページをご確認いただくか、運営スタッフに直接
  お問い合わせください」と案内してください。存在しない連絡先(メールアドレスや電話番号)を絶対に作り出さないでください。
- 参加費・日程・会場は必ずソース2(直近の開催予定)の記載に基づいて答え、記載がない場合は「運営にご確認ください」
  と案内してください。基本情報(ソース1)の一般的な説明を、個別回の参加費・日程の代わりに使わないこと。
- キャンセル規定など、上記のどのソースにも明記されていない事項については断定せず、「運営にご確認ください」と
  案内してください。
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
          const fee = e.fee_note ? ` / 参加費: ${e.fee_note}` : " / 参加費: 未設定(運営にご確認ください)";
          const desc = e.description ? ` / ${e.description}` : "";
          return `- ${e.title}(${date}${time})${venue}${fee}${desc}`;
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
