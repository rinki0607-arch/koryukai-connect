import Logo from "@/components/Logo";
import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next || "/mypage";

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto">
          <Logo size={64} />
        </div>
        <h1 className="mt-4 text-xl font-bold">パスワードの再設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          登録済みのメールアドレスを入力してください。再設定用のリンクをお送りします。
        </p>
      </div>

      {params.message && (
        <p className="mb-4 rounded-2xl bg-green-50 p-3 text-center text-sm font-medium text-green-700">
          {params.message}
        </p>
      )}
      {params.error && (
        <p className="mb-4 rounded-2xl bg-red-50 p-3 text-center text-sm font-medium text-red-700">
          {params.error}
        </p>
      )}

      {!params.message && (
        <form action={requestPasswordReset} className="card space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label">メールアドレス</label>
            <input
              name="email"
              type="email"
              className="input"
              required
              autoComplete="email"
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            再設定メールを送る
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-gray-500">
        <a
          className="font-semibold text-primary hover:underline"
          href={`/login?next=${encodeURIComponent(next)}`}
        >
          &larr; ログイン画面に戻る
        </a>
      </p>
    </div>
  );
}
