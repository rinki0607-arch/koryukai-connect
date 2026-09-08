import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { updatePasswordAfterReset } from "./actions";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto">
          <Logo size={64} />
        </div>
        <h1 className="mt-4 text-xl font-bold">新しいパスワードを設定</h1>
      </div>

      {params.error && (
        <p className="mb-4 rounded-2xl bg-red-50 p-3 text-center text-sm font-medium text-red-700">
          {params.error}
        </p>
      )}

      {!user ? (
        <div className="card space-y-3 text-center">
          <p className="text-sm text-gray-600">
            リンクが無効か、有効期限が切れています。もう一度パスワード再設定をお試しください。
          </p>
          <a href="/forgot-password" className="btn-primary inline-flex w-full">
            パスワード再設定をやり直す
          </a>
        </div>
      ) : (
        <form action={updatePasswordAfterReset} className="card space-y-4">
          <div>
            <label className="label">新しいパスワード</label>
            <input
              name="password"
              type="password"
              className="input"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">新しいパスワード(確認)</label>
            <input
              name="password_confirm"
              type="password"
              className="input"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            パスワードを変更する
          </button>
        </form>
      )}
    </div>
  );
}
