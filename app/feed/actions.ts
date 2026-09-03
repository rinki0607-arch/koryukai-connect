"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const content = String(formData.get("content") || "").trim();
  if (!content) throw new Error("投稿内容を入力してください");
  if (content.length > 1000) throw new Error("投稿は1000文字以内でお願いします");

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    content,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/feed");
}

export async function deletePost(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);

  revalidatePath("/feed");
}

export async function likePost(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase
    .from("post_likes")
    .insert({ post_id: postId, participant_id: user.id });
  if (error) throw new Error(error.message);

  revalidatePath("/feed");
}

export async function unlikePost(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("participant_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/feed");
}
