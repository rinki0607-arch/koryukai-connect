import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    mode?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  const isSignup = params.mode === "signup";
  const next = params.next || "/mypage";

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-xl font-bold">
        {isSignup ? "新規登録" : "ログイン"}
      </h1>

      {params.message && (
        <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {params.message}
        </p>
      )}
      {params.error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {params.error}
        </p>
      )}

      <form
        action={isSignup ? signUp : signIn}
        className="card space-y-4"
      >
        <input type="hidden" name="next" value={next} />
        {isSignup && (
          <div>
            <label className="label">お名前</label>
            <input name="name" className="input" required />
          </div>
        )}
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
        <div>
          <label className="label">パスワード</label>
          <input
            name="password"
            type="password"
            className="input"
            required
            minLength={6}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>
        <button type="submit" className="btn-primary w-full">
          {isSignup ? "登録する" : "ログイン"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        {isSignup ? (
          <>
            すでにアカウントをお持ちですか?{" "}
            <a
              className="text-primary hover:underline"
              href={`/login?next=${encodeURIComponent(next)}`}
            >
              ログイン
            </a>
          </>
        ) : (
          <>
            アカウントをお持ちでないですか?{" "}
            <a
              className="text-primary hover:underline"
              href={`/login?mode=signup&next=${encodeURIComponent(next)}`}
            >
              新規登録
            </a>
          </>
        )}
      </p>
    </div>
  );
}
