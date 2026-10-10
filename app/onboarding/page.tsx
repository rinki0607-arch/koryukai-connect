import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";
import OnboardingWizard from "@/components/OnboardingWizard";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if ((profile as Profile | null)?.onboarding_completed) {
    redirect("/events");
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-6 text-center">
        <div className="mx-auto w-fit">
          <Logo size={56} />
        </div>
        <h1 className="mt-3 text-xl font-bold">ようこそ、ARKIVEへ</h1>
        <p className="mt-1 text-sm text-gray-500">
          使い方の説明とプロフィール設定を済ませましょう
        </p>
      </div>
      <OnboardingWizard profile={profile as Profile} />
    </div>
  );
}
