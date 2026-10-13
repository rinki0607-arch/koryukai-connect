export const metadata = {
  title: "プライバシーポリシー | ARKIVE",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">プライバシーポリシー</h1>
      <p className="text-sm text-gray-500">最終更新日: 2026年10月14日</p>

      <div className="card space-y-4 text-sm leading-relaxed text-gray-700">
        <p>
          株式会社稟貴組(以下「当社」)は、当社が運営する交流会プラットフォーム「ARKIVE」(以下「本サービス」)において取得する利用者の個人情報について、以下のとおり取り扱います。
        </p>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">1. 収集する情報</h2>
          <p>本サービスでは、以下の情報を収集します。</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>メールアドレス・氏名・会社名・職種・業種・電話番号などのプロフィール情報</li>
            <li>交流会の参加登録履歴・出席状況</li>
            <li>他の利用者との「話してみたい」・マッチング・メッセージの履歴</li>
            <li>名刺交換(QRコード経由)により登録された情報</li>
            <li>Googleなど外部認証サービスを利用してログインする場合に取得するメールアドレス・表示名などの基本情報</li>
            <li>決済を伴う交流会の場合の決済関連情報(カード番号そのものは決済代行業者(Stripe)が管理し、当社は保持しません)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">2. 利用目的</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>交流会の運営・参加受付・当日のQR受付のため</li>
            <li>参加者同士のマッチング・紹介機能の提供のため</li>
            <li>新着交流会のお知らせ・アンケート依頼のため</li>
            <li>本サービスの改善・不正利用防止のため</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">3. 第三者サービスの利用</h2>
          <p>
            本サービスは、データベースとしてSupabase、ホスティングとしてVercelを利用しています。決済が発生する交流会ではStripeを利用します。Googleログインを利用される場合は、Googleの認証基盤を通じてメールアドレス等の基本情報を取得します。これらのサービスはそれぞれのプライバシーポリシーに従いデータを取り扱います。
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">4. 情報の開示・共有</h2>
          <p>
            法令に基づく場合を除き、ご本人の同意なく第三者に個人情報を提供することはありません。ただし、参加者名簿やマッチング機能においては、利用者が自ら入力した自己紹介・会社名等が、同一交流会の他の参加者に表示されます。
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">5. データの開示・訂正・削除のご依頼</h2>
          <p>
            ご自身の登録情報の確認・訂正はマイページから、アカウントの削除はマイページ内のアカウント設定から行えます。その他のお問い合わせは本ページ下部の連絡先までご連絡ください。
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">6. 本ポリシーの変更</h2>
          <p>
            本ポリシーは必要に応じ予告なく改定することがあります。重大な変更の場合は本サービス内でお知らせします。
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">7. お問い合わせ先</h2>
          <p>
            株式会社稟貴組(東京都渋谷区道玄坂)　代表取締役 井口稟貴
            <br />
            本サービス内のチャットサポート、またはマイページからのお問い合わせフォームをご利用ください。
          </p>
        </section>
      </div>
    </div>
  );
}
