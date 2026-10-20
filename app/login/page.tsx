import { signIn, signUp, signInWithGoogle } from "./actions";
import Logo from "@/components/Logo";

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
        <div className="mx-auto">
          <Logo size={64} />
        </div>
        <h1 className="mt-4 text-xl font-bold">
          {isSignup ? "新規登録" : "おかえりなさい"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isSignup
            ? "ARKIVEでアーク起業アカデミーの交流会に参加登録"
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

      <form action={signInWithGoogle} className="mb-4">
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="btn-secondary flex w-full items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
            />
          </svg>
          Googleで続ける
        </button>
      </form>

      <div className="mb-4 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-100" />
        またはメールアドレスで
        <span className="h-px flex-1 bg-gray-100" />
      </div>

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

      {!isSignup && (
        <p className="mt-4 text-center text-sm">
          <a
            className="text-gray-400 hover:text-primary hover:underline"
            href={`/forgot-password?next=${encodeURIComponent(next)}`}
          >
            パスワードをお忘れですか？
          </a>
        </p>
      )}

      <p className="mt-5 text-center text-sm text-gray-500">
        {isSignup ? (
          <>
            すでにアカウントをお持ちですか？{" "}
            <a
              className="font-semibold text-primary hover:underline"
              href={`/login?next=${encodeURIComponent(next)}`}
            >
              ログイン
            </a>
          </>
        ) : (
          <>
            アカウントをお持ちでないですか？{" "}
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
