import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

// 仮説検証（2026-10-29）で使う、紹介元と公開ページの計測。
// 紹介元・閲覧者IDの Cookie は middleware.ts で付ける。

export const REF_COOKIE = "arkive_ref";
export const VISITOR_COOKIE = "arkive_vid";

export async function getRefCode(): Promise<string | null> {
  const store = await cookies();
  return store.get(REF_COOKIE)?.value || null;
}

export async function getVisitorId(): Promise<string | null> {
  const store = await cookies();
  return store.get(VISITOR_COOKIE)?.value || null;
}

export type FunnelKind = "public_view" | "register_click";

// 失敗しても画面表示や登録の流れは止めない（計測は補助）
export async function logFunnelEvent(eventId: string, kind: FunnelKind) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const [visitorId, refCode] = await Promise.all([getVisitorId(), getRefCode()]);
    const supabase = createServiceClient();
    await supabase.from("funnel_events").insert({
      event_id: eventId,
      kind,
      visitor_id: visitorId,
      referral_code: refCode,
    });
  } catch {
    // 計測の失敗は無視する
  }
}

export function normalizeRefCode(raw: string | null | undefined) {
  if (!raw) return null;
  const code = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return code || null;
}

// 仮説2：交流会ページから登録に進んだ人を、アカウント作成・プロフィール入力のあとにその交流会へ戻す
export const PENDING_EVENT_COOKIE = "arkive_pending_event";

export async function popPendingEventPath(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(PENDING_EVENT_COOKIE)?.value || null;
  if (value) {
    try {
      store.delete(PENDING_EVENT_COOKIE);
    } catch {
      // Server Component から呼ばれた場合は削除できないが、1日で切れる
    }
  }
  return value && /^\/events\/[0-9a-f-]{36}$/.test(value) ? value : null;
}
