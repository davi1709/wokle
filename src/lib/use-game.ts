"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicSession } from "./content/types";
import { loadHistory } from "./storage";
import type { History, SavedDay } from "./stats";
import { useLocale } from "@/i18n/provider";

export type LoadState = "loading" | "ready" | "error";

/**
 * Loads a public session (today's, or a past day from the archive when `date`
 * is given) in the chosen language, plus the player's local history.
 * Re-fetches when the tab becomes visible again, so a tab left open overnight
 * picks up the new day instead of showing yesterday's game.
 */
export function useGame(date?: string) {
  const { locale } = useLocale();
  const [session, setSession] = useState<PublicSession | null>(null);
  const [history, setHistory] = useState<History>({});
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ lang: locale });
      if (date) qs.set("date", date);
      const res = await fetch(`/api/daily?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as PublicSession;
      setSession(data);
      setHistory(loadHistory());
      setState("ready");
    } catch {
      setState("error");
    }
  }, [locale, date]);

  useEffect(() => {
    void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const day: SavedDay | undefined = session ? history[session.date] : undefined;

  return { session, history, setHistory, today: day, state, reload: load };
}
