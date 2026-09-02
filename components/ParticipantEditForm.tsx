"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateParticipant, deleteParticipant } from "@/app/admin/participants/[id]/actions";
import { Profile } from "@/lib/types";
import { INDUSTRIES, JOB_TYPES } from "@/lib/constants";

export default function ParticipantEditForm({
  profile,
  isSelf,
}: {
  profile: Profile;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const boundUpdate = updateParticipant.bind(null, profile.id);

  return (
    <form
      action={(formData) => {
        setMessage(null);
        setErrorMsg(null);
        startTransition(async () => {
          try {
            await boundUpdate(formData);
            setMessage("保存しました");
          } catch (e: any) {
            setErrorMsg(e.message || "保存に失敗しました");
          }
        });
      }}
      className="card space-y-4"
    >
      <div>
        <label className="label">お名前</label>
        <input name="name" className="input" defaultValue={profile.name || ""} />
      </div>
      <div>
        <label className="label">会社名・所属</label>
        <input
          name="company"
          className="input"
          defaultValue={profile.company || ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">役職</label>
          <input
            name="job_title"
            className="input"
            defaultValue={profile.job_title || ""}
          />
        </div>
        <div>
          <label className="label">職種</label>
          <input
            name="job_type"
            list="job-type-list"
            className="input"
            defaultValue={profile.job_type || ""}
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
          defaultValue={profile.industry || ""}
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
          defaultValue={profile.phone || ""}
        />
      </div>
      <div>
        <label className="label">繋がりたい人について</label>
        <textarea
          name="connect_with"
          rows={3}
          className="input"
          defaultValue={profile.connect_with || ""}
        />
      </div>
      <div>
        <label className="label">権限</label>
        <select name="role" className="input" defaultValue={profile.role}>
          <option value="participant">参加者</option>
          <option value="admin">運営(管理者)</option>
        </select>
        {isSelf && (
          <p className="mt-1 text-xs text-gray-400">
            ご自身の権限です。唯一の管理者の場合は降格できません。
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "保存中..." : "保存する"}
        </button>
        {!isSelf && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (
                !confirm(
                  `${profile.name || "この参加者"}のアカウントを完全に削除します。よろしいですか?(元に戻せません)`
                )
              )
                return;
              setDeleting(true);
              startTransition(async () => {
                try {
                  await deleteParticipant(profile.id);
                } catch (e: any) {
                  setErrorMsg(e.message || "削除に失敗しました");
                  setDeleting(false);
                }
              });
            }}
            className="text-sm text-red-600 hover:underline"
          >
            {deleting ? "削除中..." : "このアカウントを削除する"}
          </button>
        )}
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
    </form>
  );
}
