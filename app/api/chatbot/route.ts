import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSupportInquiryEmail, sendBatchEmails } from "@/lib/email";

export const dynamic = "force-dynamic";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_HISTORY = 12;
const NOT_CONFIGURED_REPLY =
  "現在AIチャットボットの設定準備中のため、自動応答できません。お問い合わせは交流会当日の運営スタッフ、またはアプリ内の各ページの案内をご確認のうえ、運営までご連絡ください。";
const BUSY_REPLY =
  "只今AIチャットボットが混み合っているか、一時的にご利用いただけません。少し時間をおいて再度お試しください。";

const SUBMIT_SUPPORT_REQUEST_TOOL = {
  name: "submit_support_request",
  description:
    "交流会での通報(トラブル・迷惑行為・体調不良などの報告)、または運営担当者への問い合わせを、内容を十分に把握できた時点で送信します。" +
    "緊急の状況であっても、あなたはAIであり直接介入はできないため、必ずこのツールを使って運営に引き継いでください。" +
    "ユーザーの発言があいまいで、何が起きたか・何を伝えたいかがまだ分からない場合は、このツールを呼ぶ前に必ず質問して詳細を聞き取ってください。",
  input_schema: {
    type: "object" as const,
    properties: {
      kind: {
        type: "string",
        enum: ["report", "contact"],
        description:
          "report = 交流会での迷惑行為・トラブル・体調不良などの通報。contact = それ以外の運営への一般的な問い合わせ・要望・相談。",
      },
      summary: {
        type: "string",
        description: "内容を1文で要約したもの(運営が一覧で見て概要が分かるように)。",
      },
      details: {
        type: "string",
        description:
          "ユーザーとのやり取りから聞き取れた詳細(いつ・どこで・誰が・何が起きたか、または問い合わせの具体的な内容)。分かる範囲でよい。",
      },
      contact_name: {
        type: "string",
        description:
          "ユーザーの氏名。ログイン中で氏名が分かっている場合はそれを使い、改めて聞く必要はない。",
      },
      contact_email: {
        type: "string",
        description:
          "折り返し用のメールアドレス。ログイン中でメールアドレスが分かっている場合はそれを使う。未ログインの場合は必ず本人に確認してから設定すること。",
      },
    },
    required: ["kind", "summary"],
  },
};

function getBusinessHoursStatus(): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  let hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  if (hour === 24) hour = 0;
  const isWeekday = weekday !== "Sat" && weekday !== "Sun";
  return isWeekday && hour >= 9 && hour < 21;
}

function buildSystemPrompt(params: {
  eventsBlock: string;
  isBusinessHours: boolean;
  loggedInName: string | null;
  loggedInEmail: string | null;
}) {
  const { eventsBlock, isBusinessHours, loggedInName, loggedInEmail } = params;

  const loginBlock = loggedInName
    ? `ログイン中: 名前「${loggedInName}」、メールアドレス「${
        loggedInEmail || "(未登録)"
      }」(この情報は通報・問い合わせに自動で添付されるため、氏名・メールアドレスを改めて質問する必要はありません)`
    : "未ログイン(匿名)での利用中です。通報・問い合わせを送信する前に、運営から折り返せるよう連絡先メールアドレスを必ず確認してください。";

  const businessHoursBlock = isBusinessHours
    ? "現在は営業時間内です(平日9:00〜21:00)。通報・問い合わせを受け付けた場合は「営業時間内のため、担当者が確認し次第対応します」という趣旨を伝えてください。"
    : "現在は営業時間外です(営業時間は平日9:00〜21:00)。通報・問い合わせを受け付けた場合は「営業時間外のため、次の営業日以降に担当者が確認・対応します」という趣旨を伝えてください。ただし人命・安全に関わる緊急事態の場合は、チャットボットでは対応できない旨と、警察・救急(110/119)など公的機関への連絡を優先するよう案内してください。";

  return `あなたは「ARKIVE」というWebアプリ内に設置されたAIチャットボットです。
ARKIVEは、ヒューマンキャピタル株式会社が運営する「アーク起業塾」の月例交流会(ネットワーキングイベント)の
参加登録・プロフィール管理・当日のQR受付・マッチング・メッセージ機能をまとめたプラットフォームです。

あなたの知識は4つのソースに分かれています。質問の種類によって必ず対応するソースだけを根拠にし、
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
【ソース3: アプリの使い方(実際のアプリの挙動・コードから確認した事実)】

■ アカウント・ログイン
- 新規登録は名前・メールアドレス・パスワード(6文字以上)。登録後に確認メールが届き、メール内のリンクを開いてから
  ログインできるようになる。
- ロールは「参加者」と「運営(管理者)」の2種類のみ。新規登録は全員「参加者」からスタートする。
- パスワードを忘れた場合の自動再設定機能はアプリ内になく、運営スタッフへの連絡が必要。
- 参加者から運営への権限変更は、既存の運営メンバーが参加者詳細ページから行う(本人が自分で変更することはできない)。
- 唯一の運営メンバーは、自分自身の権限を参加者に戻すことはできない仕様(誰も管理画面に入れなくなるのを防ぐため)。
- アカウント削除は運営のみが他のユーザーに対して実行できる(自分自身のアカウントを自分で削除する機能はない)。
  削除すると元に戻せない。

■ 交流会一覧・参加登録
- 交流会一覧の閲覧・登録にはログインが必要。開催日順に月ごとにまとまって表示される。
- ステータスは「開催予定」「受付終了」「開催済み」「中止」の4種類。
- 参加登録は受付期間中であれば何度でも内容を変更・再送信できる(一度登録しても重複登録エラーにはならない)。
- 「参加する」を選んだ場合のみ、二次会希望・業種・繋がりたい人の入力欄が表示される。いずれも未入力のままでも登録できる。
- 「次回以降のデフォルトとして保存」にチェックすると、マイページのプロフィールにも反映され、次回の登録フォームの
  初期値になる。
- 定員は目安として管理画面に表示される項目で、登録数が定員を超えても自動的に受付が締め切られることはない。

■ マイページ・プロフィール
- 名前・会社名・役職・職種・業種・電話番号・繋がりたい人・自己紹介を設定でき、次回以降の交流会申込フォームの
  初期値として使われる。
- 電話番号は運営の緊急連絡専用で非公開。自己紹介・業種・繋がりたい人は参加者名簿に公開される。
- マイQRコードは全交流会共通の個人専用チケットで、当日の入場・退出の受付で提示する。

■ 参加者名簿
- ログイン済みの参加者同士でお互いのプロフィールを検索・閲覧できる(運営アカウントは名簿には表示されない)。
- 連絡先(メールアドレス・電話番号)は表示されず、氏名・会社・役職・職種・業種・繋がりたい人・自己紹介・参加回数
  のみが見える。

■ 当日のQR受付
- 1回目のスキャンで入場時刻、2回目のスキャンで退出時刻が記録される。3回目以降のスキャンは「受付・退出とも
  記録済み」として扱われ、時刻は上書きされない。
- QRコードがうまく読み取れない場合は画面の明るさを上げて再度提示し、それでも改善しない場合は運営スタッフへ。

■ マッチング・チャット
- 「話してみたい」は片思いで送っても相手には通知・表示されず、お互いが選び合って初めてマッチが成立し、
  相手の連絡先(メールアドレス)が開示される。
- 一度送った「話してみたい」は取り消すことができる。取り消すとマッチは解消され、以降その相手にはメッセージを
  送れなくなる。
- マッチが成立した相手とはアプリ内チャットでやり取りできる。会話は相手ごとに1つのスレッドにまとまり、別の
  交流会で再びマッチしても同じ会話が続く(マイページの「メッセージ」からアクセス)。
- メッセージが送れるのは、お互いにマッチが成立している相手のみ。会話画面を開くと未読メッセージは自動的に既読になる。
- マッチングページは、その交流会に「参加する」で登録済みでないと開けない。表示されるのはその回に登録している
  他の参加者のみ。

■ あなたの人的資本(マイページ)
- 参加した交流会数(当日QR受付が完了した回数)、つながった人数(マッチ成立数)、交わしたメッセージ数が表示される。
- 「〇年〇ヶ月前から育てています」は、初回のQR受付日からの経過期間。

■ メール通知
- 新しい交流会の案内メールは運営が管理画面から手動で送信する仕組み。送信先は参加者のみ(運営メンバーには送られない)。
- メール配信の設定が完了していない環境では、送信ボタンを押しても安全にスキップされ、実際には何も送信されない。

■ 管理画面(運営向け)
- 管理画面に入れるのは権限が「運営」のアカウントのみ。ダッシュボード・交流会管理・参加者データ・参加実績・
  全体集計分析・運営メンバー・通報/問い合わせの7セクションで構成される。
- 交流会の作成・編集ではタイトル・開催日・時間・会場・概要・参加費・定員・二次会有無・ステータスを設定できる。
- 交流会を削除すると、その回の参加登録・出欠記録もまとめて削除され、元に戻せない。
- 参加者データは全交流会を横断して検索・CSV出力できる。参加者詳細ページでは、その人のプロフィール編集、
  参加履歴、QR受付履歴、マッチ成立状況を確認できる。
- 参加実績ダッシュボードはQR受付実績に基づく参加回数ランキング、全体集計・分析は月別の登録数推移や業種別・
  タグ別の傾向をグラフで確認できる。

────────────────────
【ソース4: 通報・運営への問い合わせ(このチャットボット自身の機能)】
- このチャットボットには、交流会での通報(迷惑行為・トラブル・体調不良など)と、運営担当者への問い合わせの
  両方を受け付ける機能があります。ユーザーが「通報したい」「運営に問い合わせたい」「困っている」といった
  意図を示した場合は、まず落ち着いて内容を聞き取ってください。
- 十分な内容(何が起きたか、または何を問い合わせたいか)が分かったら、必ず submit_support_request ツールを
  呼び出して運営に引き継いでください。あなた自身がその場で問題を解決したり、断定的な判断を下したりしないこと。
- 内容が曖昧なまま、または挨拶程度の発言だけでツールを呼び出さないこと。最低限「何があったか/何を伝えたいか」
  が分かるまでは質問を続けてください。
- ${loginBlock}
- ${businessHoursBlock}
- ツールの実行結果を受け取ったら、送信が完了したことと、上記の営業時間に関する案内を、ユーザーに分かりやすく
  伝えてください。緊急の安全に関わる内容の場合は、チャットボット・運営への通報と並行して、必要に応じて
  警察・救急など公的機関にも連絡するよう案内してください。

────────────────────
【回答のルール】
- 質問の種類ごとに、必ず対応するソース(基本情報/直近の開催予定/アプリの使い方/通報・問い合わせ)だけを根拠に、
  簡潔に(数文程度で)日本語で回答してください。ユーザーが日本語以外で質問した場合はその言語で回答してください。
- ARKIVEおよびアーク起業塾に関係のない質問(一般的な雑談、他社サービス、コーディングの相談など)には、
  やんわりと「ARKIVE・アーク起業塾に関するご質問にお答えするチャットボットです」と伝え、深入りしないでください。
- あなたはAIによる自動応答であり、特定の会員個人の登録状況・参加履歴・パスワードなどの個人情報には
  アクセスできません。それらの質問には「ログイン後のマイページをご確認いただくか、運営スタッフに直接
  お問い合わせください」と案内してください。存在しない連絡先(メールアドレスや電話番号)を絶対に作り出さないでください。
- 参加費・日程・会場は必ずソース2(直近の開催予定)の記載に基づいて答え、記載がない場合は「運営にご確認ください」
  と案内してください。基本情報(ソース1)の一般的な説明を、個別回の参加費・日程の代わりに使わないこと。
- キャンセル規定など、上記のどのソースにも明記されていない事項については断定せず、「運営にご確認ください」と
  案内してください。
- 常に丁寧で親しみやすいトーンを保ちつつ、簡潔に。長文の説明や箇条書きの乱用は避けてください。

【直近の開催予定(自動更新・ここに無い回は把握していません)】
${eventsBlock}`;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
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

  const supabase = await createClient();

  let eventsBlock = "現在、公開されている開催予定の情報はありません。";
  try {
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

  let loggedInName: string | null = null;
  let loggedInEmail: string | null = null;
  let currentUserId: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      currentUserId = user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", user.id)
        .single();
      loggedInName = profile?.name || null;
      loggedInEmail = profile?.email || user.email || null;
    }
  } catch {
    // 未ログイン扱いで継続
  }

  const isBusinessHours = getBusinessHoursStatus();
  const systemPrompt = buildSystemPrompt({
    eventsBlock,
    isBusinessHours,
    loggedInName,
    loggedInEmail,
  });

  const anthropicMessages: { role: "user" | "assistant"; content: unknown }[] =
    messages.map((m) => ({ role: m.role, content: m.content }));

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
        max_tokens: 600,
        system: systemPrompt,
        messages: anthropicMessages,
        tools: [SUBMIT_SUPPORT_REQUEST_TOOL],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ configured: true, reply: BUSY_REPLY });
    }

    const data = await res.json();
    const content: AnthropicContentBlock[] = Array.isArray(data?.content)
      ? data.content
      : [];

    const toolUseBlocks = content.filter((b) => b.type === "tool_use");

    if (data?.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
      const textBlock = content.find((b) => b.type === "text" && b.text);
      const reply = textBlock?.text ? String(textBlock.text) : BUSY_REPLY;
      return NextResponse.json({ configured: true, reply });
    }

    // ツール呼び出しをサーバー側で実行(DB保存 + 運営へのメール通知)
    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        const input = (block.input || {}) as {
          kind?: string;
          summary?: string;
          details?: string;
          contact_name?: string;
          contact_email?: string;
        };

        const kind = input.kind === "report" ? "report" : "contact";
        const summary = String(input.summary || "").slice(0, 500) || "(要約なし)";
        const details = input.details ? String(input.details).slice(0, 4000) : null;
        const contactName = loggedInName || (input.contact_name ? String(input.contact_name).slice(0, 200) : null);
        const contactEmail =
          loggedInEmail || (input.contact_email ? String(input.contact_email).slice(0, 320) : null);

        let ok = true;
        let errorMessage: string | null = null;

        try {
          const { error: insertError } = await supabase.from("support_inquiries").insert({
            kind,
            participant_id: currentUserId,
            contact_name: contactName,
            contact_email: contactEmail,
            summary,
            details,
            is_business_hours: isBusinessHours,
          });
          if (insertError) {
            ok = false;
            errorMessage = insertError.message;
          }
        } catch (err) {
          ok = false;
          errorMessage = err instanceof Error ? err.message : String(err);
        }

        if (ok) {
          try {
            const { data: admins } = await supabase
              .from("profiles")
              .select("email")
              .eq("role", "admin")
              .not("email", "is", null);
            const adminEmails = (admins || [])
              .map((a) => a.email as string)
              .filter((e): e is string => !!e);

            if (adminEmails.length > 0) {
              const appUrl =
                process.env.NEXT_PUBLIC_APP_URL || "https://koryukai-connect.vercel.app";
              const { subject, html } = buildSupportInquiryEmail({
                kind,
                summary,
                details,
                contactName,
                contactEmail,
                isBusinessHours,
                adminUrl: `${appUrl}/admin/inquiries`,
              });
              await sendBatchEmails(adminEmails.map((to) => ({ to, subject, html })));
            }
          } catch {
            // メール送信の失敗はユーザー体験をブロックしない(DB保存は成功しているため)
          }
        }

        return {
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: JSON.stringify({
            ok,
            error: errorMessage,
            is_business_hours: isBusinessHours,
          }),
        };
      })
    );

    const followupMessages = [
      ...anthropicMessages,
      { role: "assistant" as const, content },
      { role: "user" as const, content: toolResults },
    ];

    const followupRes = await fetch(ANTHROPIC_API_URL, {
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
        messages: followupMessages,
        tools: [SUBMIT_SUPPORT_REQUEST_TOOL],
      }),
    });

    if (!followupRes.ok) {
      return NextResponse.json({
        configured: true,
        reply: toolResults.every((r) => JSON.parse(r.content).ok)
          ? "ご報告ありがとうございます。内容は運営に送信しました。担当者からの返信をお待ちください。"
          : BUSY_REPLY,
      });
    }

    const followupData = await followupRes.json();
    const followupContent: AnthropicContentBlock[] = Array.isArray(followupData?.content)
      ? followupData.content
      : [];
    const followupText = followupContent.find((b) => b.type === "text" && b.text);
    const reply = followupText?.text
      ? String(followupText.text)
      : "ご報告ありがとうございます。内容は運営に送信しました。担当者からの返信をお待ちください。";

    return NextResponse.json({ configured: true, reply });
  } catch {
    return NextResponse.json({ configured: true, reply: BUSY_REPLY });
  }
}
