import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import ChangeEmailForm from "@/components/ChangeEmailForm";
import DeleteAccountForm from "@/components/DeleteAccountForm";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ emailChanged?: string }>;
}) {
  const { emailChanged } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/account");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/mypage" className="text-sm text-gray-500 hover:text-primary">
          &larr; マイページに戻る
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold">アカウント設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          ログインに使うメールアドレス・パスワードの変更や、退会手続きはこちらから行えます。
        </p>
      </div>

      {emailChanged === "1" && (
        <div className="card border-green-200 bg-green-50 text-sm font-semibold text-green-700">
          ✅ メールアドレスを変更しました。
        </div>
      )}

      <ChangePasswordForm />
      <ChangeEmailForm currentEmail={user.email ?? null} />
      <DeleteAccountForm />
    </div>
  );
}
