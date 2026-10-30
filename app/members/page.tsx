import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DirectoryEntry } from "@/lib/types";
import MemberDirectory from "@/components/MemberDirectory";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/members");

  const { data, error } = await supabase.rpc("get_member_directory");
  const entries = (data as DirectoryEntry[]) || [];

  return (
    <div>
      <PageHeader
        title="参加者名簿"
        subtitle="これまでARKIVEにご登録いただいた参加者のプロフィールです。気になる方は⭐で保存したり、プロフィールを覗いて「話してみたい」を送ってみましょう。お互いに送り合うとマッチが成立し、メッセージでやりとりできるようになります。交流会での「話してみたい」の意思表示は、各交流会のマッチングページからも行えます。"
      />

      {error && (
        <p className="card text-sm text-red-600">
          読み込みに失敗しました: {error.message}
        </p>
      )}

      {!error && <MemberDirectory entries={entries} />}
    </div>
  );
}
