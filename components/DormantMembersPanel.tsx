"use client";

import { useState, useTransition } from "react";
import { sendReEngagementEmails } from "@/app/admin/participants/actions";

interface DormantMember {
  participant_id: string;
  name: string | null;
  email: string | null;
}

export default function DormantMembersPanel({
  members,
}: {
  members: DormantMember[];
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);

  if (members.length === 0) return null;

  const emailable = members.filter((m) => !!m.email);

  return (
    <div className="card mb-6 border-primary/15 bg-primary-light/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-primary">
            🌙 休眠会員(3ヶ月以上参加のない会員): {members.length}名
          </p>
          <p className="mt-1 text-sm text-gray-600">
            再エンゲージメールをまとめて送信できます(メール未登録の方には送信されません)。
          </p>
        </div>
        <button
          disabled={pending || emailable.length === 0}
          onClick={() => {
            if (
              !window.confirm(
                `休眠会員${emailable.length}名に再エンゲージメールを送信します。よろしいですか?`
              )
            )
              return;
            startTransition(async () => {
              setResult(null);
              const r = await sendReEngagementEmails(
                emailable.map((m) => m.participant_id)
              );
              if (!r.configured) {
                setResult({
                  text: r.error || "メール送信は未設定のためスキップされました。",
                  ok: false,
                });
              } else {
                setResult({
                  text: `${r.sent}件送信しました${r.failed ? `(${r.failed}件失敗)` : ""}。`,
                  ok: r.failed === 0,
                });
              }
            });
          }}
          className="btn-primary shrink-0 disabled:opacity-40"
        >
          {pending ? "送信中..." : `再エンゲージメールを送る(${emailable.length}件)`}
        </button>
      </div>
      {result && (
        <p
          className={`mt-3 text-sm font-medium ${
            result.ok ? "text-green-700" : "text-amber-700"
          }`}
        >
          {result.ok ? "✅ " : "⚠️ "}
          {result.text}
        </p>
      )}
    </div>
  );
}
