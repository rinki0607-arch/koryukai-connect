"use client";

import { useRef, useState, useTransition } from "react";
import { submitRegistration } from "@/app/events/[id]/actions";
import { INDUSTRIES, CONNECT_TAGS } from "@/lib/constants";
import { EventRow, Profile, RegistrationRow } from "@/lib/types";

export default function RegistrationForm({
  event,
  registration,
  profile,
}: {
  event: EventRow;
  registration: RegistrationRow | null;
  profile: Profile | null;
}) {
  const [attending, setAttending] = useState<boolean>(
    registration ? registration.attending : true
  );
  const [tags, setTags] = useState<string[]>(
    registration?.connect_with_tags?.length
      ? registration.connect_with_tags
      : profile?.connect_with_tags || []
  );
  const [wantsReceipt, setWantsReceipt] = useState<boolean>(
    registration?.wants_receipt ?? false
  );
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const paymentStatus = registration?.payment_status || "unpaid";
  const canPay = attending && !!event.fee_amount && event.fee_amount > 0;

  function handlePayment() {
    if (!formRef.current) return;
    setPaymentError(null);
    const fd = new FormData(formRef.current);
    startTransition(async () => {
      try {
        await submitRegistration(fd);
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ event_id: event.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.url) {
          window.location.href = data.url;
        } else {
          setPaymentError(
            data?.error || "決済ページの作成に失敗しました。しばらくしてから再度お試しください。"
          );
        }
      } catch {
        setPaymentError("通信エラーが発生しました。しばらくしてから再度お試しください。");
      }
    });
  }

  return (
    <form
      ref={formRef}
      className="card space-y-5"
      action={(formData) => {
        setDone(false);
        setPaymentError(null);
        startTransition(async () => {
          await submitRegistration(formData);
          setDone(true);
        });
      }}
    >
      <input type="hidden" name="event_id" value={event.id} />

      <div>
        <p className="label">この交流会に参加しますか?</p>
        <div className="segment">
          <label
            className={`segment-option ${attending ? "is-active" : ""}`}
            onClick={() => setAttending(true)}
          >
            <input
              type="radio"
              name="attending"
              value="yes"
              checked={attending}
              onChange={() => setAttending(true)}
              className="sr-only"
            />
            参加する
          </label>
          <label
            className={`segment-option ${!attending ? "is-active" : ""}`}
            onClick={() => setAttending(false)}
          >
            <input
              type="radio"
              name="attending"
              value="no"
              checked={!attending}
              onChange={() => setAttending(false)}
              className="sr-only"
            />
            参加しない
          </label>
        </div>
      </div>

      {attending && event.has_afterparty && (
        <div>
          <p className="label">二次会に参加希望しますか?</p>
          <div className="segment">
            <label className="segment-option has-[:checked]:bg-white has-[:checked]:text-primary has-[:checked]:shadow-[0_1px_6px_rgba(16,25,47,0.12)]">
              <input
                type="radio"
                name="afterparty"
                value="yes"
                defaultChecked={registration?.afterparty ?? false}
                className="sr-only"
              />
              参加希望する
            </label>
            <label className="segment-option has-[:checked]:bg-white has-[:checked]:text-primary has-[:checked]:shadow-[0_1px_6px_rgba(16,25,47,0.12)]">
              <input
                type="radio"
                name="afterparty"
                value="no"
                defaultChecked={!(registration?.afterparty ?? false)}
                className="sr-only"
              />
              参加希望しない
            </label>
          </div>
        </div>
      )}

      {attending && (
        <>
          <div>
            <label className="label">業種</label>
            <input
              name="industry"
              list="industry-list"
              className="input"
              defaultValue={
                registration?.industry || profile?.industry || ""
              }
              placeholder="例: IT・Web"
            />
            <datalist id="industry-list">
              {INDUSTRIES.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
          </div>

          <div>
            <p className="label">繋がりたい人のタイプ(複数選択可)</p>
            <div className="flex flex-wrap gap-2">
              {CONNECT_TAGS.map((tag) => (
                <label
                  key={tag}
                  className={`chip ${tags.includes(tag) ? "is-active" : ""}`}
                >
                  <input
                    type="checkbox"
                    name="connect_with_tags"
                    value={tag}
                    checked={tags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                    className="hidden"
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">
              繋がりたい人について、具体的に(自由記述)
            </label>
            <textarea
              name="connect_with"
              className="input"
              rows={3}
              defaultValue={
                registration?.connect_with || profile?.connect_with || ""
              }
              placeholder="例: 人事・採用担当の方、SaaSを提供している経営者の方 など"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" name="save_as_default" defaultChecked />
            この内容を次回以降のデフォルトプロフィールとして保存する
          </label>

          {!!event.fee_amount && event.fee_amount > 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="wants_receipt"
                  checked={wantsReceipt}
                  onChange={(e) => setWantsReceipt(e.target.checked)}
                />
                領収書の発行を希望する
              </label>
              {wantsReceipt && (
                <input
                  name="receipt_name"
                  className="input mt-2"
                  placeholder="宛名(任意・未入力の場合はお名前を使用します)"
                  defaultValue={registration?.receipt_name || ""}
                />
              )}
              <p className="mt-1.5 text-xs text-gray-400">
                オンライン決済完了後、Stripeより発行される領収書のリンクがマイページ・下記に表示されます。
              </p>
            </div>
          )}
        </>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "送信中..." : registration ? "登録内容を更新する" : "登録する"}
      </button>

      {done && (
        <p className="text-sm text-green-700">登録内容を保存しました。</p>
      )}

      {canPay && (
        <div className="border-t border-gray-100 pt-4">
          <p className="label">参加費のお支払い</p>
          {paymentStatus === "paid" ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              ✅ お支払い済みです
              {registration?.paid_amount
                ? `(${registration.paid_amount.toLocaleString()}円)`
                : ""}
              。
              {registration?.receipt_url && (
                <>
                  {" "}
                  <a
                    href={registration.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline"
                  >
                    領収書を表示
                  </a>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs text-gray-500">
                {paymentStatus === "pending"
                  ? "決済手続き中です。未完了の場合は再度お進みください。"
                  : "Stripeの決済ページで、クレジットカード等によりオンラインでお支払いいただけます。"}
              </p>
              <button
                type="button"
                onClick={handlePayment}
                disabled={pending}
                className="btn-dark w-full"
              >
                {pending
                  ? "処理中..."
                  : `オンライン決済へ進む(${event.fee_amount!.toLocaleString()}円)`}
              </button>
            </>
          )}
          {paymentError && (
            <p className="mt-2 text-sm text-red-600">{paymentError}</p>
          )}
        </div>
      )}
    </form>
  );
}
