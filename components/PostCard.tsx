"use client";

import { useTransition } from "react";
import { deletePost, likePost, unlikePost } from "@/app/feed/actions";
import { FeedPost } from "@/lib/types";
import { formatRelativeTime } from "@/lib/constants";
import Avatar from "@/components/Avatar";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
      <path
        d="M12 20.2s-7.2-4.6-9.6-9.3C.9 7.6 2.4 4 6 4c2 0 3.4 1 4.9 2.7C12.4 5 13.8 4 15.8 4c3.6 0 5.1 3.6 3.6 6.9-2.4 4.7-9.6 9.3-9.6 9.3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PostCard({
  post,
  isOwn,
}: {
  post: FeedPost;
  isOwn: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <Avatar name={post.author_name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">
              {post.author_name || "(名前未設定)"}
              {post.author_company && (
                <span className="ml-1.5 font-normal text-gray-400">
                  {post.author_company}
                </span>
              )}
            </p>
            <p className="shrink-0 text-xs text-gray-400">
              {formatRelativeTime(post.created_at)}
            </p>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-700">
            {post.content}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (post.liked_by_me) {
                    await unlikePost(post.post_id);
                  } else {
                    await likePost(post.post_id);
                  }
                })
              }
              className={`flex items-center gap-1.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 ${
                post.liked_by_me ? "text-accent-dark" : "text-gray-400 hover:text-accent-dark"
              }`}
            >
              <HeartIcon filled={post.liked_by_me} />
              {post.like_count > 0 ? post.like_count : "いいね"}
            </button>
            {isOwn && (
              <button
                disabled={pending}
                onClick={() => {
                  if (!window.confirm("この投稿を削除しますか?元に戻せません。")) return;
                  startTransition(() => deletePost(post.post_id));
                }}
                className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40"
              >
                削除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
