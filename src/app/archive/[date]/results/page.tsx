import { notFound, redirect } from "next/navigation";
import { ResultsView } from "@/components/ResultsView";
import { config } from "@/lib/content/repository";
import { dateKeyInZone, isDateKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ArchiveResultsPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isDateKey(date)) notFound();
  if (date === dateKeyInZone(new Date(), config().timezone)) redirect("/results");
  return <ResultsView date={date} />;
}
