"use client";

import { useRef, useState, useTransition } from "react";
import { createPost } from "@/app/feed/actions";
import Avatar from "@/components/Avatar";

const PROMPTS = [
  "求む: Web制作会社",
  "〇〇業界に詳しい方いませんか?",
  "今週こんなことがありました",
];

export default function FeedComposer({ name }: { name: string | null }) {
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          await createPost(formData);
          setContent("");
        })
      }
      className="card mb-6"
    >
      <div className="flex gap-3">
        <Avatar name={name} size={40} />
        <textarea
          name="content"
          className="input flex-1"
          rows={3}
          maxLength={1000}
          placeholder={`例: ${PROMPTS[0]}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-400">{content.length}/1000</p>
        <button
          type="submit"
          disabled={pending || content.trim().length === 0}
          className="btn-primary disabled:opacity-40"
        >
          {pending ? "投稿中..." : "投稿する"}
        </button>
      </div>
    </form>
  );
}
