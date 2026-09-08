"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarUrl } from "@/app/mypage/actions";
import Avatar from "@/components/Avatar";

const MAX_BYTES = 5 * 1024 * 1024;

export default function AvatarUploader({
  userId,
  name,
  avatarUrl,
}: {
  userId: string;
  name: string | null | undefined;
  avatarUrl: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    if (!file.type.startsWith("image/")) {
      setErrorMsg("画像ファイルを選択してください。");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrorMsg("5MB以下の画像を選択してください。");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);

    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      await updateAvatarUrl(publicUrlData.publicUrl);
      setPreview(publicUrlData.publicUrl);
    } catch (err: any) {
      setErrorMsg(err.message || "アップロードに失敗しました。");
      setPreview(avatarUrl);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar name={name} avatarUrl={preview} size={64} />
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 text-[10px] font-semibold text-white">
            ...
          </span>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary !min-h-0 px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {uploading ? "アップロード中..." : "写真を変更する"}
        </button>
        <p className="mt-1 text-[11px] text-gray-400">5MBまでの画像</p>
        {errorMsg && <p className="mt-1 text-xs text-red-600">{errorMsg}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
