export const metadata = {
  title: "利用規約 | ARKIVE",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">利用規約</h1>
      <p className="text-sm text-gray-500">最終更新日: 2026年10月14日</p>

      <div className="card space-y-4 text-sm leading-relaxed text-gray-700">
        <p>
          この利用規約(以下「本規約」)は、株式会社稟貴組(以下「当社」)が提供する交流会プラットフォーム「ARKIVE」(以下「本サービス」)の利用条件を定めるものです。利用者は、本サービスを利用することにより本規約に同意したものとみなします。
        </p>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第1条(登録)</h2>
          <p>
            利用者は、当社の定める方法により登録を行います。登録内容に虚偽があった場合、当社は登録を拒否または後日削除することがあります。
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第2条(禁止事項)</h2>
          <p>利用者は、本サービスの利用に当たり、以下の行為をしてはなりません。</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>法令または公序良俗に違反する行為</li>
            <li>他の利用者への迷惑・許欺行為、通報・勧誘等本サービスの目的から逸脱する営業行為</li>
            <li>他の利用者の個人情報を本人の同意なく収集・利用する行為</li>
            <li>当社または第三者の権利・名誉を侵害する行為</li>
            <li>不正アクセス・システムへの支障を与える行為</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第3条(サービスの変更・中断)</h2>
          <p>
            当社は、利用者への事前の通知なく、本サービスの内容を変更、中断または終了することがあります。これにより利用者に生じた損害について、当社は責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第4条(免責事項)</h2>
          <p>
            当社は、本サービスに起因して利用者に生じた損害について、当社の故意または重大な過失による場合を除き、責任を負いません。本サービスを通じて知り合った他の利用者との実際の交流・取引等についても、当社は責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第5条(登録抹消)</h2>
          <p>
            利用者が本規約に違反したと当社が判断した場合、当社は事前の通知なく利用者の登録を抹消し、本サービスの利用を制限することがあります。
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第6条(規約の変更)</h2>
          <p>
            当社は、必要と判断した場合、利用者への通知なく本規約を変更できるものとします。変更後の利用規約は、本サービス内に表示した時点から効力を生じるものとします。
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第7条(準拠法・管轄裁判所)</h2>
          <p>
            本規約の解釈には日本法を準拠法とし、本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を第一審の専属管轄裁判所とします。
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900">第8条(お問い合わせ)</h2>
          <p>
            株式会社稟貴組(東京都渋谷区道玄坂)　代表取締役 井口稟貴。本サービス内のチャットサポートまたはマイページからのお問い合わせフォームをご利用ください。
          </p>
        </section>
      </div>
    </div>
  );
}
