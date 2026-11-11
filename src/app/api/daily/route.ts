import { NextResponse } from "next/server";
import { buildPublicSession, resolvePlayableDate } from "@/lib/content/repository";
import { parseLocale } from "@/lib/content/challenges";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/**
 * A session without any answers. Defaults to today; `?date=YYYY-MM-DD` opens a
 * past day (archive). Future dates are refused. Identical for everyone.
 */
export async function GET(req: Request) {
  const rl = rateLimit(`daily:${clientKey(req)}`, 120);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  try {
    const params = new URL(req.url).searchParams;
    const lang = parseLocale(params.get("lang"));
    const date = resolvePlayableDate(params.get("date"));
    if (!date) return NextResponse.json({ error: "Invalid or unavailable date" }, { status: 400 });
    return NextResponse.json(buildPublicSession(new Date(), lang, date), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/daily]", err);
    return NextResponse.json({ error: "Could not load the session" }, { status: 500 });
  }
}
