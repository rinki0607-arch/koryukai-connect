// 交流会をGoogleカレンダー/その他カレンダーアプリに追加するためのユーティリティ。
// event_date・start_time・end_timeはJST(日本時間)前提で扱う。

export interface CalendarEventInput {
  id: string;
  title: string;
  eventDate: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM:SS
  endTime: string | null;
  venue: string | null;
  description: string | null;
  appUrl: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function jstToUtc(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.slice(0, 5).split(":").map(Number);
  // JSTはUTC+9固定なので、時のオフセットをそのまま引けばUTCになる(Dateが日付の繰り上げ/繰り下げを自動処理)
  return new Date(Date.UTC(y, m - 1, d, hh - 9, mm, 0));
}

function formatIcsUtc(date: Date) {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    "00Z"
  );
}

function formatDateOnly(dateStr: string) {
  return dateStr.replace(/-/g, "");
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function getTimes(ev: CalendarEventInput) {
  if (ev.startTime) {
    const start = jstToUtc(ev.eventDate, ev.startTime);
    const end = ev.endTime
      ? jstToUtc(ev.eventDate, ev.endTime)
      : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return { allDay: false as const, start, end };
  }
  return { allDay: true as const };
}

function buildDetails(ev: CalendarEventInput) {
  return [ev.description, `詳細はこちら: ${ev.appUrl}/events/${ev.id}`]
    .filter(Boolean)
    .join("\n\n");
}

export function buildGoogleCalendarUrl(ev: CalendarEventInput): string {
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", ev.title);
  params.set("details", buildDetails(ev));
  if (ev.venue) params.set("location", ev.venue);

  const times = getTimes(ev);
  if (times.allDay) {
    params.set("dates", `${formatDateOnly(ev.eventDate)}/${addDays(ev.eventDate, 1)}`);
  } else {
    params.set("dates", `${formatIcsUtc(times.start)}/${formatIcsUtc(times.end)}`);
  }
  params.set("ctz", "Asia/Tokyo");

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildIcsContent(ev: CalendarEventInput): string {
  const times = getTimes(ev);
  const uid = `${ev.id}@koryukai-connect.vercel.app`;
  const now = formatIcsUtc(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ARKIVE//koryukai-connect//JA",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
  ];

  if (times.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(ev.eventDate)}`);
    lines.push(`DTEND;VALUE=DATE:${addDays(ev.eventDate, 1)}`);
  } else {
    lines.push(`DTSTART:${formatIcsUtc(times.start)}`);
    lines.push(`DTEND:${formatIcsUtc(times.end)}`);
  }

  lines.push(`SUMMARY:${icsEscape(ev.title)}`);
  if (ev.venue) lines.push(`LOCATION:${icsEscape(ev.venue)}`);
  lines.push(`DESCRIPTION:${icsEscape(buildDetails(ev))}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}
