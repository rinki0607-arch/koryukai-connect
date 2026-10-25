import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CapitalSummary,
  EventRow,
  PendingFeedbackEvent,
  Profile,
  RegistrationRow,
} from "@/lib/types";
import {
  formatEventDate,
  INDUSTRIES,
  JOB_TYPES,
  CONNECT_TAGS,
} from "@/lib/constants";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { updateProfile } from "./actions";
import CapitalSummaryCard from "@/components/CapitalSummaryCard";
import AvatarUploader from "@/components/AvatarUploader";
import StaffCodeForm from "@/components/StaffCodeForm";
import MemberCategoryFields from "@/components/MemberCategoryFields";
import PushNotificationButton from "@/components/PushNotificationButton";

export const dynamic = "force-dynamic";

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ feedback?: string; saved?: string }>;
}) {
  const { feedback, saved } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage");

  // プロフィール・参加登録一覧・資産サマリー・アンケート未回答一覧は互いに
  // 関係のないデータなので、1つずつ順番に待つのではなく同時に取得する
  // (直列だと通信回数分の待ち時間がそのまま積み上がってしまうため)。
  const [
    { data: profile },
    { data: registrations },
    { data: capitalData },
    { data: pendingFeedbackData },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("registrations")
      .select("*, events(*)")
      .eq("participant_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_my_capital_summary"),
    supabase.rpc("get_pending_feedback_events"),
  ]);

  const capital = (capitalData as CapitalSummary[] | null)?.[0];
  const pendingFeedback = (pendingFeedbackData as PendingFeedbackEvent[]) || [];

  const p = profile as Profile;

  return (
    <div className="space-y-10">
      {saved === "1" && (
        <div className="card border-green-200 bg-green-50 text-sm font-semibold text-green-700">
          ✅ プロフィールを保存しました。
        </div>
      )}

      {feedback === "done" && (
        <div className="card border-green-200 bg-green-50 text-sm font-semibold text-green-700">
          ✅ アンケートへのご協力ありがとうございました。今後の交流会運営に役立てます。
        </div>
      )}

      {pendingFeedback.length > 0 && (
        <section>
          <div className="card border-accent/40 bg-accent/8">
            <p className="font-semibold text-primary">
              📝 参加後アンケートにご協力ください
            </p>
            <p className="mt-1 text-sm text-gray-600">
              交流会の感想をぶ詳お聞かせください。1分程度で回答できます。
            </p>
            <div className="mt-3 space-y-2">
              {pendingFeedback.map((ev) => (
                <Link
                  key={ev.event_id}
                  href={`/mypage/feedback/${ev.event_id}`}
                  className="card-tap card flex items-center justify-between bg-white"
                >
                  <div>
                    <p className="text-xs text-gray-500">
                      {formatEventDate(ev.event_date)}
                    </p>
                    <p className="font-semibold">{ev.title}</p>
                  </div>
                  <span className="btn-primary min-h-0 px-4 py-2 text-xs">
                    回答する
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {capital && (
        <section>
          <CapitalSummaryCard summary={capital} />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">マイページ</h1>
            <p className="text-sm text-gray-500">{p?.name || "お名前未設定"}</p>
          </div>
        </div>
        <div className="mb-6">
          <AvatarUploader
            userId={user.id}
            name={p?.name}
            avatarUrl={p?.avatar_url ?? null}
          />
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          <Link href="/mypage/ticket" className="btn-secondary">
            🎫 マイQRコード
          </Link>
          <Link href="/mypage/cards" className="btn-secondary">
            📋 マイ名刑
          </Link>
          <Link href="/mypage/ranking" className="btn-secondary">
            🏆 ランキング
          </Link>
          <Link href="/mypage/account" className="btn-secondary">
            🔐 アカウント設定
          </Link>
          <PushNotificationButton />
        </div>
        <form action={updateProfile} className="card max-w-xl space-y-4">
          <p className="text-sm text-gray-500">
            ここで設定した内容は、次回以降の交流会申込フォームの初期値として使われます。
          </p>
          <div>
            <label className="label">お名前</label>
            <input
              name="name"
              className="input"
              defaultValue={p?.name || ""}
            />
          </div>
          <div>
            <label className="label">会社名・所属</label>
            <input
              name="company"
              className="input"
              defaultValue={p?.company || ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">役職</label>
              <input
                name="job_title"
                className="input"
                placeholder="例: 代表取締役"
                defaultValue={p?.job_title || ""}
              />
            </div>
            <div>
              <label className="label">職種</label>
              <input
                name="job_type"
                list="job-type-list"
                className="input"
                defaultValue={p?.job_type || ""}
              />
              <datalist id="job-type-list">
                {JOB_TYPES.map((j) => (
                  <option key={j} value={j} />
                ))}
              </datalist>
            </div>
          </div>
          <div>
            <label className="label">業種</label>
            <input
              name="industry"
              list="industry-list"
              className="input"
              defaultValue={p?.industry || ""}
            />
            <datalist id="industry-list">
              {INDUSTRIES.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">電話番号</label>
            <input
              name="phone"
              type="tel"
              className="input"
              placeholder="例: 090-1234-5678"
              defaultValue={p?.phone || ""}
            />
            <p className="mt-1 text-xs text-gray-400">
              運営からの緊急連絡のみに使用し、他の参加者には公開されません。
            </p>
          </div>

          <MemberCategoryFields
            defaultCategory={p?.member_category || "general"}
            defaultFundingStage={p?.funding_stage ?? null}
            defaultNote={p?.investor_mentor_note ?? null}
          />

          <div>
            <p className="label">繋がりたい人のタイプ</p>
            <div className="flex flex-wrap gap-2">
              {CONNECT_TAGS.map((tag) => (
                <label
                  key={tag}
                  className="chip has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white border-gray-200 text-gray-500"
                >
                  <input
                    type="checkbox"
                    name="connect_with_tags"
                    value={tag}
                    defaultChecked={p?.connect_with_tags?.includes(tag)}
                    className="hidden"
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">繋がりたい人について(自由記述)</label>
            <textarea
              name="connect_with"
              className="input"
              rows={3}
              defaultValue={p?.connect_with || ""}
            />
          </div>
          <div>
            <label className="label">自己紹介(参加者名簿に表示されます)</label>
            <textarea
              name="bio"
              className="input"
              rows={4}
              placeholder="事業内容や得意分野、交流会でお話ししたいことなど、自由にご記入ください。"
              defaultValue={p?.bio || ""}
            />
          </div>
          <button type="submit" className="btn-primary">
            保存する
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">自分の参加登録</h2>
        {!registrations || registrations.length === 0 ? (
          <p className="text-sm text-gray-500">
            まだどの交流会にも登録していません。
          </p>
        ) : (
          <div className="space-y-3">
            {(registrations as (RegistrationRow & { events: EventRow })[]).map(
              (r) => {
                const isUpcoming =
                  r.events.event_date >= new Date().toISOString().slice(0, 10);
                return (
                  <div
                    key={r.id}
                    className="card flex items-center justify-between gap-3 hover:border-primary"
                  >
                    <Link
                      href={`/events/${r.event_id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="text-xs text-gray-500">
                        {formatEventDate(r.events.event_date)}
                      </p>
                      <p className="truncate font-semibold">{r.events.title}</p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      {r.attending && isUpcoming && (
                        <a
                          href={buildGoogleCalendarUrl({
                            id: r.events.id,
                            title: r.events.title,
                            eventDate: r.events.event_date,
                            startTime: r.events.start_time,
                            endTime: r.events.end_time,
                            venue: r.events.venue,
                            description: r.events.description,
                            appUrl:
                              process.env.NEXT_PUBLIC_APP_URL ||
                              "https://koryukai-connect.vercel.app",
                          })}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Googleカレンダーに追加"
                          title="Googleカレンダーに追加"
                          className="btn-ghost !min-h-0 px-2 py-1.5"
                        >
                          📅
                        </a>
                      )}
                      <span
                        className={`badge ${
                          r.attending
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {r.attending ? "参加予定" : "不参加"}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      <section>
        <StaffCodeForm />
      </section>
    </div>
  );
}
