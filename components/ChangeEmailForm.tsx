"use client";

import { useState, useTransition } from "react";
import { changeEmail } from "@/app/mypage/account/actions";

export default function ChangeEmailForm({
  currentEmail,
}: {
  currentEmail: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  return (
    <div className="card">
      <h2 className="font-semibold">メールアドレスの変更</h2>
      <p className="mt-1 text-xs text-gray-400">
        現在のメールアドレス: {currentEmail || "-"}
      </p>
      <p className="mt-1 text-xs text-gray-400">
        変更後、新しいメールアドレス宛に確認メールが届きます。リンクを開くまで変更は完了しません。
      </p>
      <form
        action={(formData) => {
          setMessage(null);
          setErrorMsg(null);
          startTransition(async () => {
            try {
              await changeEmail(formData);
              setMessage(
                "確認メールを送信しました。新しいメールアドレス宛のリンクを開くと変更が完了します。"
              );
              (document.getElementById("change-email-form") as HTMLFormElement)?.reset();
            } catch (e: any) {
              setErrorMsg(e.message || "変更に失敗しました");
            }
          });
        }}
        id="change-email-form"
        className="mt-4 space-y-3"
      >
        <div>
          <label className="label">新しいメールアドレス</label>
          <input
            name="new_email"
            type="email"
            className="input"
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label">現在のパスワード(確認のため)</label>
          <input
            name="current_password_for_email"
            type="password"
            className="input"
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn-secondary" disabled={pending}>
          {pending ? "送信中..." : "確認メールを送る"}
        </button>
      </form>
      {message && <p className="mt-2 text-sm text-green-700">{message}</p>}
      {errorMsg && <p className="mt-2 text-sm text-red-600">{errorMsg}</p>}
    </div>
  );
}
