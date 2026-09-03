"use client";

import { useState, useTransition } from "react";
import { submitRegistration } from "@/app/events/[id]/actions";
import { INDUSTRIES, CONNECT_TAGS } from "@/lib/constants";
import { EventRow, Profile, RegistrationRow } from "@/lib/types";

export default function RegistrationForm({
  event,
  registration,
  profile,
}: {
  event: EventRow;
  registration: RegistrationRow | null;
  profile: Profile | null;
}) {
  const [attending, setAttending] = useState<boolean>(
    registration ? registration.attending : true
  );
  const [tags, setTags] = useState<string[]>(
    registration?.connect_with_tags?.length
      ? registration.connect_with_tags
      : profile?.connect_with_tags || []
  );
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  return (
    <form
      className="card space-y-5"
      action={(formData) => {
        setDone(false);
        startTransition(async () => {
          await submitRegistration(formData);
          setDone(true);
        });
      }}
    >
      <input type="hidden" name="event_id" value={event.id} />

      <div>
        <p className="label">この交流会に参加しますか?</p>
        <div className="segment">
          <label
            className={`segment-option ${attending ? "is-active" : ""}`}
            onClick={() => setAttending(true)}
          >
            <input
              type="radio"
              name="attending"
              value="yes"
              checked={attending}
              onChange={() => setAttending(true)}
              className="sr-only"
            />
            参加する
          </label>
          <label
            className={`segment-option ${!attending ? "is-active" : ""}`}
            onClick={() => setAttending(false)}
          >
            <input
              type="radio"
              name="attending"
              value="no"
              checked={!attending}
              onChange={() => setAttending(false)}
              className="sr-only"
            />
            参加しない
          </label>
        </div>
      </div>

      {attending && event.has_afterparty && (
        <div>
          <p className="label">二次会に参加希望しますか?</p>
          <div className="segment">
            <label className="segment-option has-[:checked]:bg-white has-[:checked]:text-primary has-[:checked]:shadow-[0_1px_6px_rgba(16,25,47,0.12)]">
              <input
                type="radio"
                name="afterparty"
                value="yes"
                defaultChecked={registration?.afterparty ?? false}
                className="sr-only"
              />
              参加希望する
            </label>
            <label className="segment-option has-[:checked]:bg-white has-[:checked]:text-primary has-[:checked]:shadow-[0_1px_6px_rgba(16,25,47,0.12)]">
              <input
                type="radio"
                name="afterparty"
                value="no"
                defaultChecked={!(registration?.afterparty ?? false)}
                className="sr-only"
              />
              参加希望しない
            </label>
          </div>
        </div>
      )}

      {attending && (
        <>
          <div>
            <label className="label">業種</label>
            <input
              name="industry"
              list="industry-list"
              className="input"
              defaultValue={
                registration?.industry || profile?.industry || ""
              }
              placeholder="例: IT・Web"
            />
            <datalist id="industry-list">
              {INDUSTRIES.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
          </div>

          <div>
            <p className="label">繋がりたい人のタイプ(複数選択可)</p>
            <div className="flex flex-wrap gap-2">
              {CONNECT_TAGS.map((tag) => (
                <label
                  key={tag}
                  className={`chip ${tags.includes(tag) ? "is-active" : ""}`}
                >
                  <input
                    type="checkbox"
                    name="connect_with_tags"
                    value={tag}
                    checked={tags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                    className="hidden"
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">
              繋がりたい人について、具体的に(自由記述)
            </label>
            <textarea
              name="connect_with"
              className="input"
              rows={3}
              defaultValue={
                registration?.connect_with || profile?.connect_with || ""
              }
              placeholder="例: 人事・採用担当の方、SaaSを提供している経営者の方 など"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" name="save_as_default" defaultChecked />
            この内容を次回以降のデフォルトプロフィールとして保存する
          </label>
        </>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "送信中..." : registration ? "登録内容を更新する" : "登録する"}
      </button>

      {done && (
        <p className="text-sm text-green-700">登録内容を保存しました。</p>
      )}
    </form>
  );
}
