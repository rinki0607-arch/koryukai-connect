"use client";

import { useTransition, useState } from "react";
import { redeemCardQr, CardQrResult } from "@/app/mypage/cards/actions";

export default function SaveCardButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CardQrResult | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending || !!result?.ok}
        onClick={() =>
          startTransition(async () => {
            const res = await redeemCardQr(`ARKIVE:card:v1:${token}`);
            setResult(res);
          })
        }
        className="btn-primary w-full"
      >
        {pending
          ? "保存中..."
          : result?.ok
          ? "✅ 名刺を保存しました"
          : "📇 この名刺を保存する(マイ名刺に追加)"}
      </button>
      {result && !result.ok && (
        <p className="mt-2 text-sm text-red-600">{result.message}</p>
      )}
      {result?.ok && (
        <p className="mt-2 text-sm text-gray-500">
          マイページの「マイ名刺」からいつでも確認できます。
        </p>
      )}
    </div>
  );
}
