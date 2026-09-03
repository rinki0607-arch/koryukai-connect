import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SupportInquiryRow } from "@/lib/types";
import { resolveInquiry } from "./actions";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  report: "通報",
  contact: "問い合わせ",
};

const KIND_COLOR: Record<string, string> = {
  report: "bg-red-100 text-red-700",
  contact: "bg-primary-light text-primary",
};

const STATUS_LABEL: Record<string, string> = {
  open: "未対応",
  in_progress: "対応中",
  resolved: "対応済み",
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-gray-100 text-gray-500",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("support_inquiries")
    .select("*")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  if (status === "open" || status === "in_progress" || status === "resolved") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  const inquiries = (data as SupportInquiryRow[]) || [];

  const participantIds = Array.from(
    new Set(inquiries.map((i) => i.participant_id).filter((id): id is string => !!id))
  );
  let participantNames = new Map<string, { name: string | null; company: string | null }>();
  if (participantIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, company")
      .in("id", participantIds);
    participantNames = new Map(
      (profiles || []).map((p) => [p.id as string, { name: p.name, company: p.company }])
    );
  }

  const openCount = inquiries.filter((i) => i.status !== "resolved").length;

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold">通報・問い合わせ</h1>
        {openCount > 0 && (
          <span className="badge bg-red-100 text-red-700">未対応 {openCount}件</span>
        )}
      </div>
      <p className="mb-6 text-sm text-gray-500">
        AIチャットボット経由で送信された通報・問い合わせの一覧です。新着はメールでも通知されます。
      </p>

      <div className="mb-4 flex gap-2 text-sm">
        {[
          { key: undefined, label: "すべて" },
          { key: "open", label: "未対応" },
          { key: "in_progress", label: "対応中" },
          { key: "resolved", label: "対応済み" },
        ].map((f) => (
          <Link
            key={f.label}
            href={f.key ? `/admin/inquiries?status=${f.key}` : "/admin/inquiries"}
            className={`chip ${
              (status || undefined) === f.key ? "is-active" : ""
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {error && (
        <p className="card text-sm text-red-600">読み込みに失敗しました: {error.message}</p>
      )}

      {!error && inquiries.length === 0 && (
        <p className="text-sm text-gray-500">該当する通報・問い合わせはありません。</p>
      )}

      <div className="space-y-3">
        {inquiries.map((inq) => {
          const participant = inq.participant_id
            ? participantNames.get(inq.participant_id)
            : null;
          return (
            <div key={inq.id} className="card">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`badge ${KIND_COLOR[inq.kind]}`}>
                  {KIND_LABEL[inq.kind]}
                </span>
                <span className={`badge ${STATUS_COLOR[inq.status]}`}>
                  {STATUS_LABEL[inq.status]}
                </span>
                {inq.is_business_hours === false && (
                  <span className="badge bg-yellow-50 text-yellow-700">営業時間外に受信</span>
                )}
                <span className="ml-auto text-xs text-gray-400">
                  {formatDateTime(inq.created_at)}
                </span>
              </div>

              <p className="font-semibold">{inq.summary}</p>
              {inq.details && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                  {inq.details}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-sm">
                <p className="text-gray-500">
                  連絡先:{" "}
                  {participant
                    ? `${participant.name || "(名前未設定)"}${
                        participant.company ? `(${participant.company})` : ""
                      } / 登録ユーザー`
                    : inq.contact_name || "(未取得)"}
                  {inq.contact_email && ` / ${inq.contact_email}`}
                </p>
                {inq.status !== "resolved" && (
                  <form
                    action={async () => {
                      "use server";
                      await resolveInquiry(inq.id);
                    }}
                  >
                    <button type="submit" className="btn-secondary px-4 py-1.5 text-xs">
                      対応済みにする
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
