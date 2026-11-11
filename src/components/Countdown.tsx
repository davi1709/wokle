"use client";

import { useEffect, useState } from "react";
import { msUntilNextDay } from "@/lib/dates";

/** Counts down to the next WOKLE (midnight in the publication timezone). */
export function Countdown({ timeZone }: { timeZone: string }) {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMs(msUntilNextDay(new Date(), timeZone));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeZone]);

  if (ms === null) return <span className="tabular-nums">--:--:--</span>;
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return <span className="tabular-nums">{`${hh}:${mm}:${ss}`}</span>;
}
