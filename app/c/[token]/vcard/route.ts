import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PublicCard } from "@/lib/types";

export const dynamic = "force-dynamic";

function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_public_card", { p_token: token })
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "名刺が見つかりませんでした。" }, { status: 404 });
  }

  const card = data as PublicCard;
  const name = card.name || "ARKIVE";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(name)}`,
    `N:${escapeVCard(name)};;;;`,
  ];
  if (card.company) lines.push(`ORG:${escapeVCard(card.company)}`);
  if (card.job_title) lines.push(`TITLE:${escapeVCard(card.job_title)}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(card.phone)}`);
  if (card.email) lines.push(`EMAIL:${escapeVCard(card.email)}`);
  const noteParts = [card.bio, card.investor_mentor_note].filter(Boolean) as string[];
  if (noteParts.length > 0) lines.push(`NOTE:${escapeVCard(noteParts.join(" / "))}`);
  lines.push("END:VCARD");

  const body = lines.join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${encodeURIComponent(name)}.vcf"`,
    },
  });
}
