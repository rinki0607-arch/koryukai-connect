import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventRow, Profile, RegistrationRow } from "@/lib/types";
import {
  formatEventDate,
  INDUSTRIES,
  JOB_TYPES,
  CONNECT_TAGS,
} from "@/lib/constants";
import { updateProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("*, events(*)")
    .eq("participant_id", user.id)
    .order("created_at", { ascending: false });

  const p = profile as Profile;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-4 text-xl font-bold">マイページ</h1>
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
          <div>
            <p className="label">繋がりたい人のタイプ</p>
            <div className="flex flex-wrap gap-2">
              {CONNECT_TAGS.map((tag) => (
                <label
                  key={tag}
                  className="flex items-center gap-1 text-xs text-gray-600"
                >
                  <input
                    type="checkbox"
                    name="connect_with_tags"
                    value={tag}
                    defaultChecked={p?.connect_with_tags?.includes(tag)}
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
              (r) => (
                <Link
                  key={r.id}
                  href={`/events/${r.event_id}`}
                  className="card flex items-center justify-between hover:border-primary"
                >
                  <div>
                    <p className="text-xs text-gray-500">
                      {formatEventDate(r.events.event_date)}
                    </p>
                    <p className="font-semibold">{r.events.title}</p>
                  </div>
                  <span
                    className={`badge ${
                      r.attending
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {r.attending ? "参加予定" : "不参加"}
                  </span>
                </Link>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}
