# WOKLE

Daily educational puzzle about social awareness, history and human rights.
Five challenges a day (500 points): **Complete the Headline**, **Real or Fake?**, **Who Am I?**, **Which Right Is at Stake?** and **Put It in Order** (timeline)
English + Brazilian Portuguese, with an archive of past days.

> Status: **Phase 1 (playable MVP) is done.** The automated content pipeline,
> admin dashboard and accounts (Phases 2 to 5) are NOT implemented yet.
> The pool has 49 questions (11 headline, 10 real/fake, 12 who am I, 8 rights, 8 timeline), so each type repeats every 8 to 12 days. Add
> more before expecting daily players (see "Adding questions").

## Run it

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:3000
```

No credentials needed.

## Check it

```bash
npm test             # unit tests
npm run typecheck
npm run build        # production build
npm run check-links  # does every source URL still open? (needs internet)
```

## Put it online and keep updating it

1. Push the repo to GitHub.
2. https://vercel.com → Add New → Project → pick the repo → Deploy.
3. From then on: edit in VS Code → commit → push → Vercel redeploys by itself (~1 min).
4. Domain: buy it (e.g. wokle.net), then Vercel → Project → Settings → Domains →
   add it and copy the DNS records Vercel shows to your registrar.
5. Project → Settings → Environment Variables, add:
   - `NEXT_PUBLIC_SITE_URL` = `https://wokle.net`
   - `NEXT_PUBLIC_CONTACT_EMAIL` (or `NEXT_PUBLIC_REPO_URL`) for the "Report an error" link.
   Then redeploy.

Note: Vercel's free "Hobby" plan is for personal, non-commercial use. If you
add ads or charge money, check their terms or host elsewhere.

## Adding questions

Facts live in `src/lib/content/data/en.json`; Portuguese wording in `data/pt-BR.json`
(keyed by the same `id`). Rules enforced by `npm test`:

- exactly one correct option; Real/Fake uses ids `real` / `fake`; Who Am I has 3 clues
- at least 2 sources, at least one that is not Wikipedia, every URL unique
- a pt-BR entry with the same options and one translated evidence line per source

Open every source yourself and confirm it supports the claim before adding it.

## How it works

- Everyone gets the same 3 challenges per date, computed in `America/Sao_Paulo`
  (`src/lib/dates.ts`). Selection is deterministic and shuffled per cycle
  (`src/lib/selection.ts`).
- Answers never reach the browser before answering: `/api/daily` strips them,
  `/api/answer` validates server-side. Future days cannot be opened.
- Archive: past days since launch can be played; they count in statistics but not in
  the streak.
- Progress is stored in the browser (localStorage). No account needed.
- UI text: `src/i18n/en.ts` and `pt-BR.ts`.
- `db/schema.sql`: Supabase/Postgres schema for Phase 2. Not connected yet.

## Roadmap

1. ✅ MVP, archive, pt-BR
2. RSS ingestion, LLM drafting, evidence-based verification, review queue, cron
3. Optional accounts, cross-device stats
4. Admin dashboard (approve/reject, feeds, logs, AUTO/REVIEW mode)
5. Hardening, backups, CI
