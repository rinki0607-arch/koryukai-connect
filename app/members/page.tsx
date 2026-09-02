import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DirectoryEntry } from "@/lib/types";
import MemberDirectory from "@/components/MemberDirectory";

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
      <h1 className="mb-2 text-xl font-bold">参加者名簿</h1>
      <p className="mb-6 text-sm text-gray-500">
        これまでARKIVEにご登録いただいた参加者のプロフィールです。マイページの内容が反映されます。交流会での「話してみたい」の意思表示は、各交流会のマッチングページから行えます。
      </p>

      {error && (
        <p className="card text-sm text-red-600">
          読み込みに失敗しました: {error.message}
        </p>
      )}

      {!error && <MemberDirectory entries={entries} />}
    </div>
  );
}
