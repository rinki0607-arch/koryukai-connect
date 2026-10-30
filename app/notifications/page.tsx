import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationList, {
  NotificationRow,
} from "@/components/NotificationList";
import PageHeader from "@/components/PageHeader";

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
      <PageHeader
        title="お知らせ"
        subtitle="マッチ成立やコミュニティでのいいね、新しい交流会情報などをお知らせします。"
        backHref="/mypage"
        backLabel="マイページに戻る"
      />

      {error && (
        <p className="card text-sm text-red-600">
          読み込みに失敗しました: {error.message}
        </p>
      )}

      {!error && <NotificationList notifications={notifications} />}
    </div>
  );
}
