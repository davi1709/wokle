// Checks that every source URL in the content still responds.
// Run from your own machine (it needs normal internet access):
//   npm run check-links
// Exits with code 1 if any link is broken, so it can also run in CI.
import { readFileSync } from "node:fs";

const file = new URL("../src/lib/content/data/en.json", import.meta.url);
const challenges = JSON.parse(readFileSync(file, "utf8"));
const urls = new Map(); // url -> challenge ids using it
for (const c of challenges) {
  for (const s of c.sources) urls.set(s.url, [...(urls.get(s.url) ?? []), c.id]);
}

let bad = 0;
for (const [url, ids] of urls) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WOKLE-link-checker/0.2; educational project)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(20000),
    });
    // 403/429 usually mean the site blocks bots, not that the page is gone.
    const ok = res.status >= 200 && res.status < 400;
    const soft = res.status === 403 || res.status === 429;
    console.log(`${ok ? "OK  " : soft ? "WARN" : "FAIL"} ${res.status} ${url}  [${ids.join(", ")}]`);
    if (!ok && !soft) bad++;
  } catch (e) {
    console.log(`FAIL ERR ${url} (${e.message})  [${ids.join(", ")}]`);
    bad++;
  }
}
console.log(`\n${urls.size - bad}/${urls.size} links OK (WARN = site blocks bots; open it manually)`);
process.exit(bad ? 1 : 0);
