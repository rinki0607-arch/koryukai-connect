import { createClient } from "@supabase/supabase-js";

/**
 * サービスロールキーを使う管理用クライアント。
 * 必ずサーバー専用コード('use server' アクション等)からのみ呼び出すこと。
 * クライアントコンポーネントやブラウザに露出させてはいけない。
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
