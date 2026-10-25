import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const hasQuery = !!(q && q.trim());

  // 運営メンバー一覧と、検索欄の絞り込み結果は互いに無関係な問い合わせなので
  // (検索語があるときだけ)同時に取得する。
  const [{ data: admins }, searchResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "admin").order("name"),
    hasQuery
      ? supabase
          .from("profiles")
          .select("*")
          .or(`name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`)
          .limit(20)
      : Promise.resolve({ data: null as Profile[] | null }),
  ]);

  const searchResults: Profile[] = hasQuery
    ? ((searchResult.data as Profile[]) || [])
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-xl font-bold">運営メンバー</h1>
        <p className="mb-4 text-sm text-gray-500">
          管理画面(運営)にアクセスできるメンバーの一覧です。権限の変更は各メンバーの詳細ページから行います。
        </p>
        <div className="space-y-2">
          {(admins as Profile[] | null)?.map((a) => (
            <Link
              key={a.id}
              href={`/admin/participants/${a.id}`}
              className="card flex items-center justify-between hover:border-primary"
            >
              <div>
                <p className="font-medium">{a.name || "(名前未設定)"}</p>
                <p className="text-sm text-gray-500">{a.email}</p>
              </div>
              <span className="badge bg-primary-light text-primary">運営</span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          新しく運営メンバーに追加する
        </h2>
        <form className="mb-4 flex gap-2" action="/admin/team">
          <input
            name="q"
            defaultValue={q || ""}
            className="input"
            placeholder="名前・メールアドレス・会社名で検索"
          />
          <button type="submit" className="btn-primary">
            検索
          </button>
        </form>

        {q && (
          <div className="space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-gray-500">
                該当するユーザーが見つかりませんでした。
              </p>
            ) : (
              searchResults.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/participants/${r.id}`}
                  className="card flex items-center justify-between hover:border-primary"
                >
                  <div>
                    <p className="font-medium">{r.name || "(名前未設定)"}</p>
                    <p className="text-sm text-gray-500">{r.email}</p>
                  </div>
                  <span
                    className={`badge ${
                      r.role === "admin"
                        ? "bg-primary-light text-primary"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.role === "admin" ? "運営" : "参加者"}
                  </span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
