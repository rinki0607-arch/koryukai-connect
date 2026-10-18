import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventRow } from "@/lib/types";
import FeedbackForm from "@/components/FeedbackForm";

export const dynamic = "force-dynamic";

export default async function EventFeedbackPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/mypage/feedback/${eventId}`);

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) {
    return (
      <div>
        <Link href="/mypage" className="mb-4 inline-block text-sm text-gray-500 hover:text-primary">
          ← マイページに戻る
        </Link>
        <div className="card text-sm text-gray-500">
          交流会が見つかりませんでした。
        </div>
      </div>
    );
  }

  const ev = event as EventRow;

  return (
    <div>
      <Link href="/mypage" className="mb-4 inline-block text-sm text-gray-500 hover:text-primary">
        ← マイページに戻る
      </Link>
      <h1 className="mb-6 text-xl font-bold">参加後アンケート</h1>
      <FeedbackForm eventId={ev.id} eventTitle={ev.title} />
    </div>
  );
}
