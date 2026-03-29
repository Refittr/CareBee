-- Onboarding checklist: per-user step tracking
create table if not exists public.onboarding_checklist (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users(id) on delete cascade not null,
  step_key      text        not null,
  completed_at  timestamptz,
  created_at    timestamptz default now(),
  unique(user_id, step_key)
);

alter table public.onboarding_checklist enable row level security;

create policy "Users can read own checklist"
  on public.onboarding_checklist for select
  using (auth.uid() = user_id);

create policy "Users can update own checklist"
  on public.onboarding_checklist for update
  using (auth.uid() = user_id);

create policy "Users can insert own checklist"
  on public.onboarding_checklist for insert
  with check (auth.uid() = user_id);

-- Track whether the user has dismissed the checklist card
alter table public.profiles
  add column if not exists onboarding_dismissed boolean not null default false;
