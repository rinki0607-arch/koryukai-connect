import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/constants";
import {
  AdminNote,
  EventRow,
  ParticipantAdminSummary,
  Profile,
  RegistrationRow,
} from "@/lib/types";
import Avatar from "@/components/Avatar";
import { addAdminNote } from "../actions";
import DeleteNoteButton from "@/components/DeleteNoteButton";
import ParticipantEditForm from "@/components/ParticipantEditForm";

export const dynamic = "force-dynamic";

function formatDateTime(iso: string | null) {
  if (!iso) return "まだ参加実績がありません";
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: summaryData }, { data: registrations }, { data: notesData }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase.rpc("get_participant_admin_summary", { p_participant_id: id }),
      supabase
        .from("registrations")
        .select("*, events(*)")
        .eq("participant_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("admin_notes")
        .select("*, profiles!admin_notes_author_id_fkey(name)")
        .eq("participant_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!profile) notFound();

  const p = profile as Profile;
  const summary = (summaryData as ParticipantAdminSummary[] | null)?.[0];
  const notes = ((notesData as unknown as (AdminNote & {
    profiles: { name: string | null } | null;
  })[]) || []).map((n) => ({ ...n, author_name: n.profiles?.name }));

  const isDormant =
    !!summary?.last_attended_at &&
    new Date(summary.last_attended_at).getTime() <
      Date.now() - 1000 * 60 * 60 * 24 * 90;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/participants"
          className="text-sm text-gray-500 hover:text-primary"
        >
          ← 参加者データに戻る
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Avatar name={p.name} size={56} />
        <div>
          <h1 className="text-xl font-bold">{p.name || "(名前未設定)"}</h1>
          <p className="text-sm text-gray-500">
            {p.company}
            {p.job_title ? ` / ${p.job_title}` : ""}
          </p>
        </div>
        {isDormant && (
          <span className="badge ml-auto bg-gray-100 text-gray-500">
            🌙 休眠会員
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card">
          <p className="text-xs text-gray-500">累計参加回数</p>
          <p className="mt-1 text-2xl font-bold">
            {summary?.events_attended ?? 0}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">最終参加日</p>
          <p className="mt-1 text-sm font-semibold">
            {formatDateTime(summary?.last_attended_at ?? null)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">マッチ数</p>
          <p className="mt-1 text-2xl font-bold">{summary?.matches_count ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">メッセージ数</p>
          <p className="mt-1 text-2xl font-bold">
            {summary?.messages_count ?? 0}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">プロフィール編集・権限変更</h2>
        <p className="mb-3 text-xs text-gray-400">
          メールアドレス・自己紹介はここでは編集できません(本人のマイページで設定されます)。権限を「運営(管理者)」に変更すると、このアカウントは管理画面にアクセスできるようになります。
        </p>
        <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-400">メール</dt>
            <dd>{p.email || "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-400">自己紹介</dt>
            <dd className="whitespace-pre-wrap">{p.bio || "-"}</dd>
          </div>
        </dl>
        <ParticipantEditForm profile={p} isSelf={currentUser?.id === p.id} />
      </div>

      <div>
        <h2 className="mb-3 font-semibold">参加登録履歴</h2>
        {!registrations || registrations.length === 0 ? (
          <p className="text-sm text-gray-500">登録履歴はありません。</p>
        ) : (
          <div className="space-y-2">
            {(registrations as (RegistrationRow & { events: EventRow })[]).map(
              (r) => (
                <div
                  key={r.id}
                  className="card flex items-center justify-between"
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
                    {r.attending ? "参加予定/参加" : "不参加"}
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-semibold">運営メモ・フォローアップ</h2>
        <form action={addAdminNote} className="card mb-4 space-y-3">
          <input type="hidden" name="participant_id" value={id} />
          <textarea
            name="note"
            className="input"
            rows={3}
            placeholder="この方についてのメモ、次回のフォローアップ内容などを記入してください。"
            required
          />
          <button type="submit" className="btn-primary">
            メモを追加
          </button>
        </form>

        {notes.length === 0 ? (
          <p className="text-sm text-gray-500">まだメモはありません。</p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <p className="whitespace-pre-wrap text-sm">{n.note}</p>
                  <DeleteNoteButton noteId={n.id} participantId={id} />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  {n.author_name || "運営"} ・{" "}
                  {new Date(n.created_at).toLocaleString("ja-JP")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
