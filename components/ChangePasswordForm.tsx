"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/app/mypage/account/actions";

export default function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  return (
    <div className="card">
      <h2 className="font-semibold">パスワードの変更</h2>
      <p className="mt-1 text-xs text-gray-400">
        現在のパスワードを確認のうえ、新しいパスワードに変更します。
      </p>
      <form
        action={(formData) => {
          setMessage(null);
          setErrorMsg(null);
          startTransition(async () => {
            try {
              await changePassword(formData);
              setMessage("パスワードを変更しました。");
              (document.getElementById("change-password-form") as HTMLFormElement)?.reset();
            } catch (e: any) {
              setErrorMsg(e.message || "変更に失敗しました");
            }
          });
        }}
        id="change-password-form"
        className="mt-4 space-y-3"
      >
        <div>
          <label className="label">現在のパスワード</label>
          <input
            name="current_password"
            type="password"
            className="input"
            required
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="label">新しいパスワード</label>
          <input
            name="new_password"
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
            name="new_password_confirm"
            type="password"
            className="input"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn-secondary" disabled={pending}>
          {pending ? "変更中..." : "パスワードを変更する"}
        </button>
      </form>
      {message && <p className="mt-2 text-sm text-green-700">{message}</p>}
      {errorMsg && <p className="mt-2 text-sm text-red-600">{errorMsg}</p>}
    </div>
  );
}
