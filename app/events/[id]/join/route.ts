import { NextResponse } from "next/server";
import { logFunnelEvent, PENDING_EVENT_COOKIE } from "@/lib/tracking";

// 仮説2：未ログインの人が「参加登録する」を押した数を記録し、アカウント作成へ進める。
// 作成後はこの交流会の登録フォームに戻る。
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await logFunnelEvent(id, "register_click");
  const url = new URL("/login", request.url);
  url.searchParams.set("mode", "signup");
  url.searchParams.set("next", `/events/${id}`);
  const res = NextResponse.redirect(url);
  // プロフィール入力(オンボーディング)を挟んでも、この交流会に戻れるようにする
  res.cookies.set(PENDING_EVENT_COOKIE, `/events/${id}`, {
    maxAge: 60 * 60 * 24,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
