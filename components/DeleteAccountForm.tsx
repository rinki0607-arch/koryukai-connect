"use client";

import { useState, useTransition } from "react";
import { deleteMyAccount } from "@/app/mypage/account/actions";

export default function DeleteAccountForm() {
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  return (
    <div className="card border-red-200 bg-red-50/40">
      <h2 className="font-semibold text-red-700">退会(アカウントの削除)</h2>
      <p className="mt-1 text-xs text-red-500">
        退会すると、プロフィール・参加登録履歴・マッチ・メッセージ・投稿など、このアカウントに紐づくすべてのデータが完全に削除され、元に戻せません。決済履歴の記録もあわせて削除されますが、Stripe側の取引記録自体は残ります。
      </p>
      <form
        action={(formData) => {
          setErrorMsg(null);
          if (
            !confirm(
              "本当に退会しますか?すべてのデータが完全に削除され、元に戻せません。"
            )
          )
            return;
          startTransition(async () => {
            try {
              await deleteMyAccount(formData);
            } catch (e: any) {
              setErrorMsg(e.message || "退会処理に失敗しました");
            }
          });
        }}
        className="mt-4 space-y-3"
      >
        <div>
          <label className="label text-red-600">
            確認のため「退会する」と入力してください
          </label>
          <input
            name="confirm_text"
            className="input border-red-200"
            required
            placeholder="退会する"
          />
        </div>
        <div>
          <label className="label text-red-600">現在のパスワード</label>
          <input
            name="current_password_for_delete"
            type="password"
            className="input border-red-200"
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn-danger" disabled={pending}>
          {pending ? "処理中..." : "退会してアカウントを削除する"}
        </button>
      </form>
      {errorMsg && <p className="mt-2 text-sm text-red-600">{errorMsg}</p>}
    </div>
  );
}
