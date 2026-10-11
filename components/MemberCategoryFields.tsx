"use client";

import { useState } from "react";
import { FUNDING_STAGES, MEMBER_CATEGORIES } from "@/lib/constants";

export default function MemberCategoryFields({
  defaultCategory,
  defaultFundingStage,
  defaultNote,
}: {
  defaultCategory: string;
  defaultFundingStage: string | null;
  defaultNote: string | null;
}) {
  const [category, setCategory] = useState(defaultCategory || "general");

  return (
    <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
      <div>
        <p className="label">ご自身の属性</p>
        <p className="mb-2 text-xs text-gray-400">
          投資家・メンターとして登録すると、参加者マッチングや名簿にバッジが表示され、起業家からの相談を受けやすくなります。
        </p>
        <div className="flex flex-wrap gap-2">
          {MEMBER_CATEGORIES.map((c) => (
            <label
              key={c.value}
              className={`chip ${category === c.value ? "is-active" : ""}`}
            >
              <input
                type="radio"
                name="member_category"
                value={c.value}
                checked={category === c.value}
                onChange={() => setCategory(c.value)}
                className="hidden"
              />
              {c.emoji} {c.label}
            </label>
          ))}
        </div>
      </div>

      {category === "founder" && (
        <div>
          <label className="label">資金調達ステージ</label>
          <select
            name="funding_stage"
            className="input"
            defaultValue={defaultFundingStage || ""}
          >
            <option value="">選択しない</option>
            {FUNDING_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {(category === "investor" || category === "mentor") && (
        <div>
          <label className="label">
            {category === "investor"
              ? "投資領域・できる支援(自由記述)"
              : "得意分野・できる支援(自由記述)"}
          </label>
          <textarea
            name="investor_mentor_note"
            className="input"
            rows={3}
            placeholder={
              category === "investor"
                ? "例: シード〜シリーズAのSaaS領域に投資。資金調達の壁打ち可能。"
                : "例: BtoBマーケティング・採用の壁打ちが得意。月1回までオンライン相談可。"
            }
            defaultValue={defaultNote || ""}
          />
        </div>
      )}
    </div>
  );
}
