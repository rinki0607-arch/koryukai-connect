"use client";

import { EventRow } from "@/lib/types";

export default function EventForm({
  event,
  action,
}: {
  event?: EventRow;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="card max-w-xl space-y-4">
      <div>
        <label className="label">交流会タイトル</label>
        <input
          name="title"
          required
          className="input"
          defaultValue={event?.title || ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">開催日</label>
          <input
            name="event_date"
            type="date"
            required
            className="input"
            defaultValue={event?.event_date || ""}
          />
        </div>
        <div>
          <label className="label">ステータス</label>
          <select
            name="status"
            className="input"
            defaultValue={event?.status || "upcoming"}
          >
            <option value="upcoming">開催予定</option>
            <option value="closed">受付終了</option>
            <option value="past">開催済み</option>
            <option value="canceled">中止</option>
          </select>
        </div>
        <div>
          <label className="label">開始時刻</label>
          <input
            name="start_time"
            type="time"
            className="input"
            defaultValue={event?.start_time?.slice(0, 5) || ""}
          />
        </div>
        <div>
          <label className="label">終了時刻</label>
          <input
            name="end_time"
            type="time"
            className="input"
            defaultValue={event?.end_time?.slice(0, 5) || ""}
          />
        </div>
      </div>
      <div>
        <label className="label">会場</label>
        <input
          name="venue"
          className="input"
          defaultValue={event?.venue || ""}
        />
      </div>
      <div>
        <label className="label">概要</label>
        <textarea
          name="description"
          rows={4}
          className="input"
          defaultValue={event?.description || ""}
        />
      </div>
      <div>
        <label className="label">参加費(任意)</label>
        <input
          name="fee_note"
          className="input"
          placeholder="例: 3,000円(二次会別途) / 無料"
          defaultValue={event?.fee_note || ""}
        />
        <p className="mt-1 text-xs text-gray-400">
          ここに入力した内容が交流会一覧・詳細ページと、AIチャットボットの回答にそのまま使われます。
        </p>
      </div>
      <div>
        <label className="label">定員(任意)</label>
        <input
          name="capacity"
          type="number"
          min={1}
          className="input"
          defaultValue={event?.capacity ?? ""}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          name="has_afterparty"
          defaultChecked={event?.has_afterparty ?? true}
        />
        二次会の参加希望を確認する
      </label>
      <button type="submit" className="btn-primary">
        {event ? "更新する" : "作成する"}
      </button>
    </form>
  );
}
