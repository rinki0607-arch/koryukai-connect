import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationList, {
  NotificationRow,
} from "@/components/NotificationList";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/notifications");

  const { data, error } = await supabase.rpc("get_my_notifications", {
    p_limit: 50,
  });
  const notifications = (data as NotificationRow[]) || [];

  return (
    <div>
      <Link href="/mypage" className="mb-3 inline-block text-sm text-gray-500 hover:text-primary">
        ← マイページに戻る
      </Link>
      <h1 className="mb-2 text-xl font-bold">お知らせ</h1>
      <p className="mb-6 text-sm text-gray-500">
        マッチ成立やコミュニティでのいいね、新しい交流会情報などをお知らせします。
      </p>

      {error && (
        <p className="card text-sm text-red-600">
          読み込みに失敗しました: {error.message}
        </p>
      )}

      {!error && <NotificationList notifications={notifications} />}
    </div>
  );
}
