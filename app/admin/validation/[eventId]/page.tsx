import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/constants";
import CopyLinkButton from "@/components/CopyLinkButton";
import { saveValidationNote, toggleRegistrationFlag } from "../actions";

export const dynamic = "force-dynamic";

// 仮説検証ダッシュボード(交流会ごと)。
// 「ARKIVE 仮説検証プラン」の5つの仮説を、合格ラインと並べて表示する。

interface Reg {
  id: string;
  participant_id: string;
  attending: boolean;
  industry: string | null;
  connect_with: string | null;
  connect_with_tags: string[] | null;
  goal_text: string | null;
  wants_intro: boolean | null;
  intro_sent_at: string | null;
  referral_code: string | null;
  interview_requested_at: string | null;
  interview_done_at: string | null;
  enrolled_at: string | null;
  created_at: string;
  profiles: { name: string | null; company: string | null; created_at: string | null } | null;
}

type Verdict = "pass" | "fail" | "pending";

const VERDICT_STYLE: Record<Verdict, string> = {
  pass: "bg-green-100 text-green-700",
  fail: "bg-red-100 text-red-700",
  pending: "bg-gray-100 text-gray-600",
};
const VERDICT_LABEL: Record<Verdict, string> = {
  pass: "合格ラインに到達",
  fail: "合格ラインに未達",
  pending: "データ不足",
};

function pct(n: number, d: number) {
  if (!d) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

function rate(n: number, d: number) {
  return d ? n / d : 0;
}

function HypothesisCard({
  no,
  title,
  passLine,
  verdict,
  children,
}: {
  no: number;
  title: string;
  passLine: string;
  verdict: Verdict;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-primary">仮説{no}</p>
          <h2 className="font-semibold">{title}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${VERDICT_STYLE[verdict]}`}>
          {VERDICT_LABEL[verdict]}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">合格ライン：{passLine}</p>
      <div className="mt-3 text-sm text-gray-700">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}

function FlagButton({
  reg,
  field,
  eventId,
  onLabel,
  offLabel,
}: {
  reg: Reg;
  field: "intro_sent_at" | "interview_done_at" | "enrolled_at";
  eventId: string;
  onLabel: string;
  offLabel: string;
}) {
  const isOn = !!reg[field];
  return (
    <form action={toggleRegistrationFlag}>
      <input type="hidden" name="registration_id" value={reg.id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="on" value={isOn ? "0" : "1"} />
      <button
        type="submit"
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          isOn ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        {isOn ? onLabel : offLabel}
      </button>
    </form>
  );
}

// 「話すとよい3人」の候補：繋がりたい人のタグの重なり×10＋業種が同じ5
function suggestPeople(me: Reg, others: Reg[]) {
  const myTags = new Set(me.connect_with_tags || []);
  return others
    .filter((o) => o.participant_id !== me.participant_id)
    .map((o) => {
      const shared = (o.connect_with_tags || []).filter((t) => myTags.has(t));
      const sameIndustry = !!me.industry && !!o.industry && me.industry === o.industry;
      return { reg: o, shared, score: shared.length * 10 + (sameIndustry ? 5 : 0) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export default async function AdminValidationEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const [{ data: event }, { data: regData }, { data: attendance }, { data: funnel }, { data: notes }] =
    await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
      supabase
        .from("registrations")
        .select(
          "id, participant_id, attending, industry, connect_with, connect_with_tags, goal_text, wants_intro, intro_sent_at, referral_code, interview_requested_at, interview_done_at, enrolled_at, created_at, profiles(name, company, created_at)"
        )
        .eq("event_id", eventId),
      supabase
        .from("attendance")
        .select("participant_id, checked_in_at")
        .eq("event_id", eventId)
        .not("checked_in_at", "is", null),
      supabase.from("funnel_events").select("kind, visitor_id, created_at").eq("event_id", eventId),
      supabase.from("validation_notes").select("key, value").in("key", ["h1", `h5:${eventId}`]),
    ]);

  if (!event) notFound();
  const ev = event as EventRow;
  const regs = ((regData as unknown as Reg[]) || []).filter((r) => r.attending);
  const checkins = ((attendance as { participant_id: string; checked_in_at: string }[]) || [])
    .map((a) => ({ ...a, t: Date.parse(a.checked_in_at) }))
    .sort((a, b) => a.t - b.t);
  const checkedInIds = new Set(checkins.map((c) => c.participant_id));
  const funnelRows = (funnel as { kind: string; visitor_id: string | null; created_at: string }[]) || [];
  const noteMap = new Map(
    ((notes as { key: string; value: Record<string, number | boolean | string> }[]) || []).map((n) => [
      n.key,
      n.value,
    ])
  );
  const h1Note = noteMap.get("h1") || {};
  const h5Note = noteMap.get(`h5:${eventId}`) || {};
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://koryukai-connect.vercel.app";

  // ---- 仮説1：交流会のあとの面談・入塾 ----
  const attendedBase = checkins.length > 0 ? regs.filter((r) => checkedInIds.has(r.participant_id)) : regs;
  const interviewReq = attendedBase.filter((r) => r.interview_requested_at).length;
  const interviewDone = attendedBase.filter((r) => r.interview_done_at).length;
  const enrolled = attendedBase.filter((r) => r.enrolled_at).length;
  const h1Interviewed = Number(h1Note.interviewed || 0);
  const h1FollowupTop = Number(h1Note.followup_top || 0);
  const h1Verdict: Verdict =
    h1Interviewed < 3 ? "pending" : rate(h1FollowupTop, h1Interviewed) >= 0.6 ? "pass" : "fail";

  // ---- 仮説2：公開ページから登録まで ----
  const uniq = (kind: string) =>
    new Set(funnelRows.filter((f) => f.kind === kind).map((f) => f.visitor_id || f.created_at)).size;
  const publicViews = uniq("public_view");
  const registerClicks = uniq("register_click");
  const firstFunnelAt = funnelRows.length
    ? Math.min(...funnelRows.map((f) => Date.parse(f.created_at)))
    : null;
  const newUserRegs = firstFunnelAt
    ? regs.filter((r) => r.profiles?.created_at && Date.parse(r.profiles.created_at) >= firstFunnelAt).length
    : 0;
  const h2Verdict: Verdict =
    registerClicks < 5 ? "pending" : rate(newUserRegs, registerClicks) >= 0.7 ? "pass" : "fail";

  // ---- 仮説3：事前に3人を案内すると面談が増えるか ----
  const wantsIntro = regs.filter((r) => r.wants_intro);
  const introSent = attendedBase.filter((r) => r.intro_sent_at);
  const noIntro = attendedBase.filter((r) => !r.intro_sent_at);
  const introInterviewRate = rate(introSent.filter((r) => r.interview_requested_at).length, introSent.length);
  const noIntroInterviewRate = rate(noIntro.filter((r) => r.interview_requested_at).length, noIntro.length);
  const h3Verdict: Verdict =
    regs.length < 10 || introSent.length < 3
      ? "pending"
      : rate(wantsIntro.length, regs.length) >= 0.3 &&
          introInterviewRate >= Math.max(noIntroInterviewRate * 1.5, 0.01)
        ? "pass"
        : "fail";

  // ---- 仮説4：紹介元 ----
  const withRef = regs.filter((r) => r.referral_code);
  const byRef = new Map<string, Reg[]>();
  for (const r of regs) {
    const key = (r.referral_code || "(紹介元なし)").trim().toLowerCase();
    if (!byRef.has(key)) byRef.set(key, []);
    byRef.get(key)!.push(r);
  }
  const refRows = Array.from(byRef.entries()).sort((a, b) => b[1].length - a[1].length);
  const h4Verdict: Verdict = regs.length < 10 ? "pending" : rate(withRef.length, regs.length) >= 0.9 ? "pass" : "fail";

  // ---- 仮説5：QR受付 ----
  const spanMin =
    checkins.length >= 2 ? (checkins[checkins.length - 1].t - checkins[0].t) / 60000 : 0;
  const secPerPerson = checkins.length >= 2 ? Math.round((spanMin * 60) / checkins.length) : 0;
  let peak5min = 0;
  for (let i = 0; i < checkins.length; i++) {
    let j = i;
    while (j < checkins.length && checkins[j].t - checkins[i].t < 5 * 60000) j++;
    peak5min = Math.max(peak5min, j - i);
  }
  const baselineSec = Number(h5Note.baseline_sec || 0);
  const staffWantsKeep = h5Note.keep === true;
  const h5Verdict: Verdict =
    checkins.length < 10 || !baselineSec
      ? "pending"
      : secPerPerson <= baselineSec / 2 && staffWantsKeep
        ? "pass"
        : "fail";

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/validation" className="text-sm text-gray-500 hover:text-primary">
          ← 仮説検証に戻る
        </Link>
        <p className="mt-3 text-sm text-gray-500">{formatEventDate(ev.event_date)}</p>
        <h1 className="text-xl font-bold">{ev.title}：仮説検証</h1>
        <p className="mt-1 text-sm text-gray-500">
          参加予定 {regs.length}人 ／ 受付済み {checkins.length}人
        </p>
      </div>

      <HypothesisCard
        no={1}
        title="主催者の一番の困りごとは、交流会のあと面談・入塾につながらないこと"
        passLine="主催者インタビュー5人中3人以上(6割以上)が、交流後のフォローか効果測定を一番に挙げる"
        verdict={h1Verdict}
      >
        <form action={saveValidationNote} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="key" value="h1" />
          <input type="hidden" name="event_id" value={eventId} />
          <label className="text-xs text-gray-500">
            インタビューした人数
            <input
              name="v_interviewed"
              type="number"
              min={0}
              defaultValue={h1Interviewed || ""}
              className="input mt-1 w-28"
            />
          </label>
          <label className="text-xs text-gray-500">
            うち「交流後」を一番に挙げた人数
            <input
              name="v_followup_top"
              type="number"
              min={0}
              defaultValue={h1FollowupTop || ""}
              className="input mt-1 w-28"
            />
          </label>
          <button type="submit" className="btn-secondary">保存</button>
        </form>
        <p className="mt-1 text-xs text-gray-400">この数字は全交流会で共通です。</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="参加者" value={attendedBase.length} />
          <Stat label="面談を希望" value={`${interviewReq}(${pct(interviewReq, attendedBase.length)})`} />
          <Stat label="面談を実施" value={`${interviewDone}(${pct(interviewDone, attendedBase.length)})`} />
          <Stat label="入塾" value={`${enrolled}(${pct(enrolled, attendedBase.length)})`} />
        </div>
      </HypothesisCard>

      <HypothesisCard
        no={2}
        title="交流会の中身が見えれば、参加者は申込のついでに登録してくれる"
        passLine="「参加登録する」を押した人の70%以上が登録を完了する(押した人が5人以上で判定)"
        verdict={h2Verdict}
      >
        <div className="grid grid-cols-3 gap-2">
          <Stat label="未ログインでページを見た人" value={publicViews} />
          <Stat label="「参加登録する」を押した人" value={registerClicks} />
          <Stat label="新しく登録して申込んだ人" value={`${newUserRegs}(${pct(newUserRegs, registerClicks)})`} />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          交流会ページはログインなしで見られるようになっています。申込者の数は、このページの公開以降にアカウントを作った人です。
        </p>
      </HypothesisCard>

      <HypothesisCard
        no={3}
        title="事前に「話すとよい3人」を案内すると、交流会のあとの面談が増える"
        passLine="希望が参加予定者の30%以上、かつ案内した人の面談希望率が案内なしの1.5倍以上"
        verdict={h3Verdict}
      >
        <div className="grid grid-cols-3 gap-2">
          <Stat label="案内を希望した人" value={`${wantsIntro.length}(${pct(wantsIntro.length, regs.length)})`} />
          <Stat label="案内した人の面談希望率" value={pct(introSent.filter((r) => r.interview_requested_at).length, introSent.length)} />
          <Stat label="案内なしの面談希望率" value={pct(noIntro.filter((r) => r.interview_requested_at).length, noIntro.length)} />
        </div>

        <p className="mt-4 font-semibold">案内リスト(運営が手作業で送る)</p>
        {wantsIntro.length === 0 ? (
          <p className="mt-1 text-xs text-gray-500">まだ希望者はいません。</p>
        ) : (
          <div className="mt-2 space-y-3">
            {wantsIntro.map((r) => {
              const picks = suggestPeople(r, regs);
              const message =
                `${r.profiles?.name || ""}さん、${ev.title}へのお申込みありがとうございます。` +
                `当日はぜひ次の方と話してみてください。\n` +
                picks
                  .map(
                    (p, i) =>
                      `${i + 1}. ${p.reg.profiles?.name || "参加者"}さん` +
                      (p.reg.profiles?.company ? `(${p.reg.profiles.company})` : "") +
                      (p.shared.length ? `：共通の関心「${p.shared.join("・")}」` : "")
                  )
                  .join("\n");
              return (
                <div key={r.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {r.profiles?.name || "(名前未設定)"}
                      {r.profiles?.company ? (
                        <span className="ml-1 text-xs font-normal text-gray-500">{r.profiles.company}</span>
                      ) : null}
                    </p>
                    <div className="flex gap-2">
                      <CopyLinkButton url={message} />
                      <FlagButton reg={r} field="intro_sent_at" eventId={eventId} onLabel="案内済み" offLabel="案内済みにする" />
                    </div>
                  </div>
                  {r.goal_text && <p className="mt-1 text-xs text-gray-500">相談したいこと：{r.goal_text}</p>}
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-xs text-gray-700">{message}</pre>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-xs text-gray-400">
          候補は「繋がりたい人のタイプ」の重なりと業種で選んでいます。送る前に運営が目で確かめてください。「リンクをコピー」で案内文をコピーできます。
        </p>
      </HypothesisCard>

      <HypothesisCard
        no={4}
        title="紹介元ごとに参加と入塾を区別できれば、報酬と営業の精度が上がる"
        passLine="申込の90%以上で紹介元が分かる(申込10人以上で判定)。アーク側がこの数字を報酬確認に使うと合意"
        verdict={h4Verdict}
      >
        <Stat label="紹介元が分かる申込" value={`${withRef.length} / ${regs.length}(${pct(withRef.length, regs.length)})`} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="py-1 pr-3">紹介元</th>
                <th className="py-1 pr-3">申込</th>
                <th className="py-1 pr-3">来場</th>
                <th className="py-1 pr-3">面談希望</th>
                <th className="py-1 pr-3">面談実施</th>
                <th className="py-1 pr-3">入塾</th>
              </tr>
            </thead>
            <tbody>
              {refRows.map(([code, list]) => (
                <tr key={code} className="border-t border-gray-100">
                  <td className="py-1.5 pr-3 font-semibold">{code}</td>
                  <td className="py-1.5 pr-3">{list.length}</td>
                  <td className="py-1.5 pr-3">{list.filter((r) => checkedInIds.has(r.participant_id)).length}</td>
                  <td className="py-1.5 pr-3">{list.filter((r) => r.interview_requested_at).length}</td>
                  <td className="py-1.5 pr-3">{list.filter((r) => r.interview_done_at).length}</td>
                  <td className="py-1.5 pr-3">{list.filter((r) => r.enrolled_at).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-semibold">紹介用リンク</p>
        <p className="text-xs text-gray-500">
          末尾の「ref=」の後ろを、パートナーごとの名前(英数字)に変えて配ってください。例：ref=rinkigumi-iguchi
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <code className="rounded bg-gray-50 px-2 py-1 text-xs">{`${appUrl}/events/${eventId}?ref=パートナー名`}</code>
          <CopyLinkButton url={`${appUrl}/events/${eventId}?ref=`} />
        </div>
      </HypothesisCard>

      <HypothesisCard
        no={5}
        title="QR受付で、当日の受付が大きく楽になる"
        passLine="1人あたりの受付時間が従来の半分以下、かつ運営が「続けたい」と答える(受付10人以上で判定)"
        verdict={h5Verdict}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="受付した人数" value={checkins.length} />
          <Stat label="最初〜最後の受付" value={spanMin ? `${Math.round(spanMin)}分` : "—"} />
          <Stat label="1人あたり(目安)" value={secPerPerson ? `${secPerPerson}秒` : "—"} />
          <Stat label="5分間の最大受付数" value={peak5min} />
        </div>
        <form action={saveValidationNote} className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="key" value={`h5:${eventId}`} />
          <input type="hidden" name="event_id" value={eventId} />
          <label className="text-xs text-gray-500">
            従来の受付(名簿・手作業)の1人あたり秒数
            <input
              name="v_baseline_sec"
              type="number"
              min={0}
              defaultValue={baselineSec || ""}
              className="input mt-1 w-28"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" name="v_keep" defaultChecked={staffWantsKeep} />
            運営は「QR受付を続けたい」と答えた
          </label>
          <button type="submit" className="btn-secondary">保存</button>
        </form>
      </HypothesisCard>

      <div className="card">
        <h2 className="font-semibold">参加者ごとの記録(面談・入塾)</h2>
        <p className="mt-1 text-xs text-gray-500">
          交流会のあとの面談・入塾は、ここで運営が記録します。面談希望は参加者のアンケートから自動で入ります。
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="py-1 pr-3">参加者</th>
                <th className="py-1 pr-3">紹介元</th>
                <th className="py-1 pr-3">来場</th>
                <th className="py-1 pr-3">面談希望</th>
                <th className="py-1 pr-3">面談</th>
                <th className="py-1 pr-3">入塾</th>
              </tr>
            </thead>
            <tbody>
              {regs.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 align-middle">
                  <td className="py-1.5 pr-3">
                    <Link href={`/admin/participants/${r.participant_id}`} className="font-semibold hover:text-primary">
                      {r.profiles?.name || "(名前未設定)"}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3">{r.referral_code || "—"}</td>
                  <td className="py-1.5 pr-3">{checkedInIds.has(r.participant_id) ? "済" : "—"}</td>
                  <td className="py-1.5 pr-3">{r.interview_requested_at ? "希望" : "—"}</td>
                  <td className="py-1.5 pr-3">
                    <FlagButton reg={r} field="interview_done_at" eventId={eventId} onLabel="実施済み" offLabel="未実施" />
                  </td>
                  <td className="py-1.5 pr-3">
                    <FlagButton reg={r} field="enrolled_at" eventId={eventId} onLabel="入塾" offLabel="未" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
