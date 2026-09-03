"use client";

import { useRef, useState, useTransition } from "react";
import { saveBusinessCard } from "@/app/mypage/cards/actions";

interface ExtractedCard {
  name: string;
  company: string;
  job_title: string;
  phone: string;
  email: string;
}

const EMPTY: ExtractedCard = { name: "", company: "", job_title: "", phone: "", email: "" };

function fileToBase64(file: File): Promise<{ mediaType: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const match = result.match(/^data:(.+);base64,(.*)$/);
      if (!match) {
        reject(new Error("画像の読み込みに失敗しました"));
        return;
      }
      resolve({ mediaType: match[1], data: match[2] });
    };
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}

export default function CardScanner() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [fields, setFields] = useState<ExtractedCard>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleFile(file: File) {
    setScanning(true);
    setScanError(null);
    try {
      const { mediaType, data } = await fileToBase64(file);
      const res = await fetch("/api/business-cards/ocr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ media_type: mediaType, data }),
      });
      const json = await res.json();
      if (!res.ok) {
        setScanError(json.error || "読み取りに失敗しました");
        setFields(EMPTY);
        setShowForm(true);
        return;
      }
      setFields({
        name: json.name || "",
        company: json.company || "",
        job_title: json.job_title || "",
        phone: json.phone || "",
        email: json.email || "",
      });
      setShowForm(true);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "読み取りに失敗しました");
      setShowForm(true);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="card mb-6">
      <p className="font-semibold">名刺をスキャンする</p>
      <p className="mt-1 text-sm text-gray-500">
        名刺を撮影すると、AIが氏名・会社名・連絡先を自動で読み取ります。画像自体は保存されません。
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={scanning}
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary disabled:opacity-40"
        >
          {scanning ? "読み取り中..." : "📷 名刺を撮影/選択"}
        </button>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setFields(EMPTY);
              setScanError(null);
              setShowForm(true);
            }}
            className="btn-secondary"
          >
            手動で入力する
          </button>
        )}
      </div>

      {scanError && (
        <p className="mt-3 text-sm text-red-600">{scanError}</p>
      )}

      {showForm && (
        <form
          action={(formData) =>
            startTransition(async () => {
              await saveBusinessCard(formData);
              setShowForm(false);
              setFields(EMPTY);
            })
          }
          className="mt-4 space-y-3 border-t border-gray-100 pt-4"
        >
          <p className="text-xs text-gray-400">
            内容を確認・修正してから保存してください。
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">氏名</label>
              <input
                name="name"
                className="input"
                value={fields.name}
                onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">会社名</label>
              <input
                name="company"
                className="input"
                value={fields.company}
                onChange={(e) => setFields((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">役職</label>
              <input
                name="job_title"
                className="input"
                value={fields.job_title}
                onChange={(e) => setFields((f) => ({ ...f, job_title: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">電話番号</label>
              <input
                name="phone"
                className="input"
                value={fields.phone}
                onChange={(e) => setFields((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">メールアドレス</label>
              <input
                name="email"
                className="input"
                value={fields.email}
                onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">メモ(任意)</label>
              <textarea name="note" className="input" rows={2} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-40">
              {pending ? "保存中..." : "この内容で保存する"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-ghost"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
