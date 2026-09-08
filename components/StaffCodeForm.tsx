"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemStaffAdminCode } from "@/app/mypage/actions";

export default function StaffCodeForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  return (
    <details className="card">
      <summary className="cursor-pointer select-none text-sm font-semibold text-gray-500">
        事務局の方はこちら
      </summary>
      <p className="mt-2 text-xs text-gray-400">
        運営スタッフに共有されている「運営コード」を入力すると、このアカウントに管理者権限が付与されます。
      </p>
      <form
        action={(formData) => {
          setMessage(null);
          setErrorMsg(null);
          startTransition(async () => {
            try {
              await redeemStaffAdminCode(formData);
              setMessage(
                "管理者権限を付与しました。まもなくページが更新され、「管理画面」が表示されます。"
              );
              router.refresh();
            } catch (e: any) {
              setErrorMsg(e.message || "エラーが発生しました");
            }
          });
        }}
        className="mt-3 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-[160px] flex-1">
          <label className="label">運営コード</label>
          <input
            name="code"
            type="password"
            autoComplete="off"
            className="input"
            placeholder="運営から共有されたコード"
          />
        </div>
        <button type="submit" className="btn-secondary" disabled={pending}>
          {pending ? "確認中..." : "権限を有効にする"}
        </button>
      </form>
      {message && <p className="mt-2 text-sm text-green-700">{message}</p>}
      {errorMsg && <p className="mt-2 text-sm text-red-600">{errorMsg}</p>}
    </details>
  );
}
