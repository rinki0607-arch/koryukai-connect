import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <div>
      <div className="mb-6 flex gap-4 border-b border-gray-200 pb-3 text-sm">
        <Link href="/admin" className="text-gray-600 hover:text-primary">
          ダッシュボード
        </Link>
        <Link href="/admin/events" className="text-gray-600 hover:text-primary">
          交流会管理
        </Link>
        <Link
          href="/admin/participants"
          className="text-gray-600 hover:text-primary"
        >
          参加者データ
        </Link>
        <Link
          href="/admin/attendance"
          className="text-gray-600 hover:text-primary"
        >
          参加実績ダッシュボード
        </Link>
      </div>
      {children}
    </div>
  );
}
