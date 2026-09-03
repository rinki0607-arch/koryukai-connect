import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildIcsContent } from "@/lib/calendar";
import { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ev = event as EventRow;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://koryukai-connect.vercel.app";

  const ics = buildIcsContent({
    id: ev.id,
    title: ev.title,
    eventDate: ev.event_date,
    startTime: ev.start_time,
    endTime: ev.end_time,
    venue: ev.venue,
    description: ev.description,
    appUrl,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="arkive-${ev.id}.ics"`,
    },
  });
}
