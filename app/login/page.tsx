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
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-xl font-bold text-accent shadow-[0_6px_18px_rgba(16,25,47,0.25)]">
          A
        </div>
        <h1 className="mt-4 text-xl font-bold">
          {isSignup ? "新規登録" : "おかえりなさい"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isSignup
            ? "ARKIVEでアーク起業塾の交流会に参加登録"
            : "ARKIVEにログインして続ける"}
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

      <p className="mt-5 text-center text-sm text-gray-500">
        {isSignup ? (
          <>
            すでにアカウントをお持ちですか?{" "}
            <a
              className="font-semibold text-primary hover:underline"
              href={`/login?next=${encodeURIComponent(next)}`}
            >
              ログイン
            </a>
          </>
        ) : (
          <>
            アカウントをお持ちでないですか?{" "}
            <a
              className="font-semibold text-primary hover:underline"
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
