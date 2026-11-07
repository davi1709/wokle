import { notFound, redirect } from "next/navigation";
import { PlayView } from "@/components/PlayView";
import { config } from "@/lib/content/repository";
import { dateKeyInZone, isDateKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ArchiveDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isDateKey(date)) notFound();
  // Today's game is the normal one: it counts for the streak.
  if (date === dateKeyInZone(new Date(), config().timezone)) redirect("/play");
  return <PlayView date={date} />;
}
