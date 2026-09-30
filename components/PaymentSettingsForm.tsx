"use client";

import { useState, useTransition } from "react";
import {
  saveStripeSettingsAction,
  clearStripeSettingsAction,
} from "@/app/admin/settings/payments/actions";
import { PaymentSettingsStatus } from "@/lib/payment-settings";

export default function PaymentSettingsForm({
  status,
}: {
  status: PaymentSettingsStatus;
}) {
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  function handleSave() {
    setMessage(null);
    const formData = new FormData();
    formData.set("secret_key", secretKey);
    formData.set("webhook_secret", webhookSecret);

    startTransition(async () => {
      const result = await saveStripeSettingsAction(formData);
      if (result.ok) {
        setMessage({ type: "success", text: "決済設定を保存しました。" });
        setSecretKey("");
        setWebhookSecret("");
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }

  function handleClear() {
    if (!confirm("保存済みのStripe決済設定を削除します。よろしいですか?(参加者側の決済ボタンが表示されなくなります)")) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await clearStripeSettingsAction();
      if (result.ok) {
        setMessage({ type: "success", text: "決済設定を削除しました。" });
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="mb-1 text-sm font-semibold">現在の設定状況</p>
        {status.envOverride && (
          <p className="mb-3 text-xs text-gray-500">
            ※ Vercelの環境変数(STRIPE_SECRET_KEY等)が設定されているため、そちらの値が優先的に使用されています。この画面から設定しても、環境変数を削除するまでは反映されません。
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 p-3">
            <p className="text-xs text-gray-500">シークレットキー</p>
            {status.stripeConfigured ? (
              <p className="mt-1 font-mono text-sm text-green-700">
                ✅ 設定済み {status.secretKeyPreview && `(${status.secretKeyPreview})`}
              </p>
            ) : (
              <p className="mt-1 text-sm text-red-600">未設定</p>
            )}
          </div>
          <div className="rounded-xl border border-gray-100 p-3">
            <p className="text-xs text-gray-500">Webhook署名シークレット</p>
            {status.webhookConfigured ? (
              <p className="mt-1 font-mono text-sm text-green-700">
                ✅ 設定済み {status.webhookSecretPreview && `(${status.webhookSecretPreview})`}
              </p>
            ) : (
              <p className="mt-1 text-sm text-red-600">未設定</p>
            )}
          </div>
        </div>
        {status.updatedAt && (
          <p className="mt-3 text-xs text-gray-400">
            最終更新: {new Date(status.updatedAt).toLocaleString("ja-JP")}
            {status.updatedByName ? ` (${status.updatedByName}さん)` : ""}
          </p>
        )}
      </div>

      <div className="card space-y-4">
        <p className="text-sm font-semibold">設定を更新する</p>
        <div>
          <label className="label">Stripeシークレットキー(sk_で始まる文字列)</label>
          <input
            type="password"
            className="input"
            autoComplete="off"
            placeholder={status.stripeConfigured ? "変更しない場合は空欄のままでOK" : "sk_live_..."}
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Webhook署名シークレット(whsec_で始まる文字列)</label>
          <input
            type="password"
            className="input"
            autoComplete="off"
            placeholder={
              status.webhookConfigured ? "変更しない場合は空欄のままでOK" : "whsec_..."
            }
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
          />
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-green-700" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary"
            disabled={isPending}
            onClick={handleSave}
          >
            {isPending ? "保存中..." : "保存する"}
          </button>
          {(status.stripeConfigured || status.webhookConfigured) && (
            <button
              type="button"
              className="btn-secondary"
              disabled={isPending}
              onClick={handleClear}
            >
              設定を削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
