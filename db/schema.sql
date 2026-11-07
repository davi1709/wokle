-- ============================================================================
-- WOKLE database schema (PostgreSQL / Supabase)
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Phase 1 (demo) does not need it; Phase 2 (automation) does.
-- Safe to re-run: uses IF NOT EXISTS where possible.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type challenge_type as enum ('headline', 'real_or_fake', 'who_am_i');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('verified', 'needs_review', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type challenge_status as enum ('candidate', 'approved', 'scheduled', 'published', 'retired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type source_type as enum ('primary', 'encyclopedia', 'news', 'academic');
exception when duplicate_object then null; end $$;

-- ── Taxonomy ────────────────────────────────────────────────────────────────
create table if not exists categories (
  slug        text primary key,
  name        text not null,
  description text,
  weight      numeric not null default 1 check (weight >= 0), -- used for weighted selection
  created_at  timestamptz not null default now()
);

-- ── Challenges ──────────────────────────────────────────────────────────────
create table if not exists challenges (
  id                  uuid primary key default gen_random_uuid(),
  challenge_type      challenge_type not null,
  category            text not null references categories(slug),
  language            text not null default 'en',
  -- Groups translations of the same factual record (future pt-BR / es).
  translation_group   uuid not null default gen_random_uuid(),
  question            text not null,
  correct_answer      text not null,
  explanation         text not null,
  context             text not null default '',
  difficulty          smallint not null default 2 check (difficulty between 1 and 3),
  region              text,
  entities            text[] not null default '{}',
  status              challenge_status not null default 'candidate',
  verification_status verification_status not null default 'needs_review',
  verification_notes  text,
  quality_score       numeric check (quality_score between 0 and 1),
  is_demo             boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Only verified content can be approved/scheduled/published.
  constraint publishable_must_be_verified check (
    status in ('candidate', 'retired') or verification_status = 'verified'
  )
);
create index if not exists challenges_status_idx on challenges (status, verification_status);
create index if not exists challenges_type_idx on challenges (challenge_type, status);
create index if not exists challenges_category_idx on challenges (category);

create table if not exists options (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references challenges(id) on delete cascade,
  position      smallint not null check (position between 1 and 4),
  option_text   text not null,
  is_correct    boolean not null default false,
  unique (challenge_id, position)
);
-- Exactly one correct option per challenge.
create unique index if not exists options_one_correct on options (challenge_id) where is_correct;

create table if not exists clues (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references challenges(id) on delete cascade,
  clue_number   smallint not null check (clue_number between 1 and 3),
  clue_text     text not null,
  unique (challenge_id, clue_number)
);

-- Evidence behind every answer. A challenge cannot be verified without it.
create table if not exists sources (
  id               uuid primary key default gen_random_uuid(),
  challenge_id     uuid not null references challenges(id) on delete cascade,
  source_title     text not null,
  publisher        text not null,
  source_url       text not null check (source_url ~* '^https?://'),
  publication_date date,
  access_date      date not null default current_date,
  source_type      source_type not null default 'encyclopedia',
  evidence_summary text not null,
  link_ok          boolean,            -- result of the last link check
  link_checked_at  timestamptz,
  unique (challenge_id, source_url)
);
create index if not exists sources_challenge_idx on sources (challenge_id);

-- ── Daily sessions ──────────────────────────────────────────────────────────
-- One row per publication date. The unique constraint on `date` is what makes
-- the pipeline idempotent: running it twice cannot create two sessions.
create table if not exists daily_sessions (
  id              uuid primary key default gen_random_uuid(),
  date            date not null unique,
  session_number  integer not null unique,
  challenge_1_id  uuid not null references challenges(id),
  challenge_2_id  uuid not null references challenges(id),
  challenge_3_id  uuid not null references challenges(id),
  status          text not null default 'scheduled' check (status in ('scheduled', 'published', 'cancelled')),
  created_at      timestamptz not null default now(),
  check (challenge_1_id <> challenge_2_id and challenge_2_id <> challenge_3_id and challenge_1_id <> challenge_3_id)
);

-- Once a session is published, its challenges must not change in ways that
-- alter what players saw (the expected answer cannot move under them).
create or replace function protect_published_challenge() returns trigger as $$
begin
  if exists (
    select 1 from daily_sessions s
    where s.status = 'published'
      and new.id in (s.challenge_1_id, s.challenge_2_id, s.challenge_3_id)
  ) and (new.question <> old.question or new.correct_answer <> old.correct_answer) then
    raise exception 'Cannot change question/answer of an already published challenge (%). Retire it and publish a correction instead.', old.id;
  end if;
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_protect_published on challenges;
create trigger trg_protect_published before update on challenges
  for each row execute function protect_published_challenge();

-- ── Users & play history ────────────────────────────────────────────────────
-- Optional accounts (Phase 3). Anonymous players never touch these tables.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists user_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  challenge_id     uuid not null references challenges(id),
  selected_answer  text not null,
  clues_revealed   smallint check (clues_revealed between 1 and 3),
  score            smallint not null check (score between 0 and 100),
  answered_at      timestamptz not null default now(),
  unique (user_id, challenge_id)          -- one attempt per challenge, no re-rolls
);
create index if not exists user_attempts_user_idx on user_attempts (user_id, answered_at desc);

create table if not exists user_stats (
  user_id         uuid primary key references profiles(id) on delete cascade,
  total_score     integer not null default 0,
  total_sessions  integer not null default 0,
  current_streak  integer not null default 0,
  longest_streak  integer not null default 0,
  last_played     date
);

-- ── Automation ──────────────────────────────────────────────────────────────
create table if not exists source_feeds (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  feed_url             text not null unique check (feed_url ~* '^https?://'),
  source_type          source_type not null default 'news',
  thematic_categories  text[] not null default '{}',
  enabled              boolean not null default true,
  reliability_level    smallint not null default 3 check (reliability_level between 1 and 5),
  last_fetched_at      timestamptz,
  last_error           text,
  created_at           timestamptz not null default now()
);

-- Raw items discovered by the ingestion step; cached so we never re-research.
create table if not exists source_items (
  id            uuid primary key default gen_random_uuid(),
  feed_id       uuid not null references source_feeds(id) on delete cascade,
  item_url      text not null,
  title         text not null,
  summary       text,
  published_at  timestamptz,
  content_hash  text not null,
  processed     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (item_url)
);
create index if not exists source_items_unprocessed on source_items (processed, created_at);

create table if not exists content_generation_logs (
  id                    uuid primary key default gen_random_uuid(),
  execution_date        date not null,
  started_at            timestamptz not null default now(),
  finished_at           timestamptz,
  status                text not null check (status in ('running', 'success', 'partial', 'failed')),
  generated_candidates  integer not null default 0,
  verified_candidates   integer not null default 0,
  rejected_candidates   integer not null default 0,
  error_message         text,
  details               jsonb not null default '{}'
);
create index if not exists logs_date_idx on content_generation_logs (execution_date desc);

create table if not exists settings (
  key    text primary key,
  value  jsonb not null
);
insert into settings (key, value) values
  ('publish_mode', '"AUTO_PUBLISH"'),
  ('timezone', '"America/Sao_Paulo"'),
  ('launch_date', '"2026-11-04"'),
  ('reserve_target_days', '30')
on conflict (key) do nothing;

-- ── Content reserve view (verified & not yet scheduled) ─────────────────────
create or replace view content_reserve as
select c.id, c.challenge_type, c.category, c.region, c.quality_score, c.created_at
from challenges c
where c.verification_status = 'verified'
  and c.status in ('approved')
  and not exists (
    select 1 from daily_sessions s
    where c.id in (s.challenge_1_id, s.challenge_2_id, s.challenge_3_id)
  );

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Principle: the browser (anon key) can NEVER read answers directly. All
-- gameplay goes through our API routes, which use the service-role key
-- server-side. Therefore the content tables have RLS enabled and NO public
-- policies. Users can only see their own personal rows.
alter table categories               enable row level security;
alter table challenges               enable row level security;
alter table options                  enable row level security;
alter table clues                    enable row level security;
alter table sources                  enable row level security;
alter table daily_sessions           enable row level security;
alter table profiles                 enable row level security;
alter table user_attempts            enable row level security;
alter table user_stats               enable row level security;
alter table source_feeds             enable row level security;
alter table source_items             enable row level security;
alter table content_generation_logs  enable row level security;
alter table settings                 enable row level security;

-- Category names are harmless: readable by everyone.
drop policy if exists "categories are public" on categories;
create policy "categories are public" on categories for select using (true);

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own attempts read" on user_attempts;
create policy "own attempts read" on user_attempts for select using (auth.uid() = user_id);

drop policy if exists "own stats read" on user_stats;
create policy "own stats read" on user_stats for select using (auth.uid() = user_id);

-- Inserts into user_attempts / user_stats happen server-side (service role),
-- after the answer has been validated, so users cannot forge scores.

-- ── Seed categories ─────────────────────────────────────────────────────────
insert into categories (slug, name) values
  ('gender',       'Gender Equality & Feminism'),
  ('lgbtq',        'LGBTQ+ Rights & Diversity'),
  ('race',         'Racial Equality & Racism'),
  ('environment',  'Environment & Climate'),
  ('human-rights', 'Human Rights & Social Justice'),
  ('disability',   'Accessibility & Disability Rights'),
  ('indigenous',   'Indigenous Peoples & Cultural Preservation'),
  ('tech',         'Technology, AI & Society'),
  ('education',    'Education & Equal Opportunities'),
  ('politics',     'Politics, Democracy & Representation')
on conflict (slug) do nothing;
