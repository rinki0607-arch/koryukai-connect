"use client";

import { useState } from "react";
import { JOB_TYPES, INDUSTRIES, CONNECT_TAGS } from "@/lib/constants";
import { completeOnboarding, skipOnboarding } from "@/app/onboarding/actions";
import type { Profile } from "@/lib/types";

const STEPS = ["基本情報", "興味・関心", "自己紹介"] as const;

export default function OnboardingWizard({
  profile,
}: {
  profile: Profile | null;
}) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  return (
    <form action={completeOnboarding}>
      <div className="mb-6 flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i <= step ? "bg-primary text-white" : "bg-gray-200 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && <div className="h-0.5 w-6 bg-gray-200" />}
          </div>
        ))}
      </div>
      <p className="mb-5 text-center text-sm font-semibold text-gray-500">
        {STEPS[step]}({step + 1}/{STEPS.length})
      </p>

      <div className="card space-y-4" hidden={step !== 0}>
        <div>
          <label className="label">会社名・所属</label>
          <input
            name="company"
            className="input"
            placeholder="例: 株式会社ARKIVE"
            defaultValue={profile?.company || ""}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">役職</label>
            <input
              name="job_title"
              className="input"
              placeholder="例: 代表取締役"
              defaultValue={profile?.job_title || ""}
            />
          </div>
          <div>
            <label className="label">職種</label>
            <input
              name="job_type"
              list="job-type-list"
              className="input"
              defaultValue={profile?.job_type || ""}
            />
            <datalist id="job-type-list">
              {JOB_TYPES.map((j) => (
                <option key={j} value={j} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      <div className="card space-y-4" hidden={step !== 1}>
        <div>
          <label className="label">業種</label>
          <input
            name="industry"
            list="industry-list"
            className="input"
            defaultValue={profile?.industry || ""}
          />
          <datalist id="industry-list">
            {INDUSTRIES.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </div>
        <div>
          <p className="label">繋がりたい人のタイプ</p>
          <div className="flex flex-wrap gap-2">
            {CONNECT_TAGS.map((tag) => (
              <label
                key={tag}
                className="chip has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white border-gray-200 text-gray-500"
              >
                <input
                  type="checkbox"
                  name="connect_with_tags"
                  value={tag}
                  defaultChecked={profile?.connect_with_tags?.includes(tag)}
                  className="hidden"
                />
                {tag}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label">繋がりたい人について(自由記述)</label>
          <textarea
            name="connect_with"
            className="input"
            rows={3}
            defaultValue={profile?.connect_with || ""}
          />
        </div>
      </div>

      <div className="card space-y-4" hidden={step !== 2}>
        <div>
          <label className="label">自己紹介(参加者名簿に表示されます)</label>
          <textarea
            name="bio"
            className="input"
            rows={4}
            placeholder="事業内容や得意分野、交流会でお話ししたいことなど、自由にご記入ください。"
            defaultValue={profile?.bio || ""}
          />
        </div>
        <div>
          <label className="label">電話番号(任意)</label>
          <input
            name="phone"
            type="tel"
            className="input"
            placeholder="例: 090-1234-5678"
            defaultValue={profile?.phone || ""}
          />
          <p className="mt-1 text-xs text-gray-400">
            運営からの緊急連絡のみに使用し、他の参加者には公開されません。
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="btn-secondary flex-1"
          >
            戻る
          </button>
        )}
        {!last ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="btn-primary flex-1"
          >
            次へ
          </button>
        ) : (
          <button type="submit" className="btn-primary flex-1">
            はじめる
          </button>
        )}
      </div>

      <p className="mt-4 text-center">
        <button
          type="submit"
          formAction={skipOnboarding}
          className="text-xs text-gray-400 underline"
        >
          あとで入力する
        </button>
      </p>
    </form>
  );
}
