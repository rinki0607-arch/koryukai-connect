import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role クライアント。RLSを無視して全ユーザーのデータにアクセスできるため、
// サーバー専用のAPIルート(プッシュ通知の送信など)からのみ使用すること。
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
