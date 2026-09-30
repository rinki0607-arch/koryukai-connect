import { getPaymentSettingsStatus } from "@/lib/payment-settings";
import PaymentSettingsForm from "@/components/PaymentSettingsForm";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://koryukai-connect.vercel.app";
const WEBHOOK_URL = `${APP_URL}/api/stripe/webhook`;

export default async function PaymentSettingsPage() {
  const status = await getPaymentSettingsStatus();

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold">決済設定(Stripe連携)</h1>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        交流会の参加費をオンライン決済(Stripe)で集金するための設定です。ここで設定した内容はこのアプリのデータベースに保存され、Vercelなどの開発者向け管理画面を操作する必要はありません。事務局の方がこの画面だけで設定を完了できます。
      </p>

      <div className="card mb-6 space-y-2 text-sm text-gray-600">
        <p className="font-semibold text-gray-700">設定の流れ</p>
        <ol className="list-inside list-decimal space-y-1">
          <li>
            <a
              href="https://dashboard.stripe.com/register"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              Stripeのアカウント
            </a>
            をまだお持ちでない場合は作成してください(無料)。
          </li>
          <li>
            Stripeダッシュボードの「開発者」→「APIキー」から「シークレットキー」をコピーし、下のフォームに貼り付けて保存します。
          </li>
          <li>
            Stripeダッシュボードの「開発者」→「Webhook」で「エンドポイントを追加」し、エンドポイントURLに次のURLを入力します。
            <div className="mt-1 rounded-lg bg-gray-50 p-2 font-mono text-xs text-gray-700 break-all">
              {WEBHOOK_URL}
            </div>
            リッスンするイベントは <span className="font-mono">checkout.session.completed</span> を選択してください。
          </li>
          <li>
            Webhook作成後に表示される「署名シークレット」(whsec_で始まる文字列)をコピーし、下のフォームに貼り付けて保存します。
          </li>
          <li>
            両方保存すると、参加者側の交流会ページに自動的に決済ボタンが表示されるようになります(交流会編集画面で「参加費・金額」が設定されている交流会のみ)。
          </li>
        </ol>
      </div>

      <PaymentSettingsForm status={status} />
    </div>
  );
}
