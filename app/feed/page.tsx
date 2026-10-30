import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedPost } from "@/lib/types";
import FeedComposer from "@/components/FeedComposer";
import PostCard from "@/components/PostCard";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/feed");

  const [{ data: profile }, { data: postsData }] = await Promise.all([
    supabase.from("profiles").select("name, avatar_url").eq("id", user.id).single(),
    supabase.rpc("get_feed_posts", { p_limit: 50 }),
  ]);

  const posts = (postsData as FeedPost[]) || [];

  return (
    <div>
      <PageHeader
        title="コミュニティフィード"
        subtitle="「求む: Web制作会社」「〇〇業界の詳しい方いませんか」など、交流会の合間にも会員同士でつながれる掲示板です。"
      />

      <FeedComposer name={profile?.name || null} avatarUrl={profile?.avatar_url || null} />

      {posts.length === 0 ? (
        <p className="text-sm text-gray-500">
          まだ投稿がありません。最初の投稿をしてみましょう。
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.post_id} post={post} isOwn={post.author_id === user.id} />
          ))}
        </div>
      )}
    </div>
  );
}
