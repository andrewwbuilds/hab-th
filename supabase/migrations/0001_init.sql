-- Encore schema: profiles, applications, reviews, pets (roadies)

create type public.role_t as enum ('applicant', 'organizer');
create type public.track_t as enum ('hacker', 'judge', 'mentor', 'volunteer');
create type public.status_t as enum ('draft', 'submitted', 'under_review', 'accepted', 'waitlisted', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.role_t not null default 'applicant',
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  track public.track_t not null,
  status public.status_t not null default 'draft',
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, track)
);
create index applications_status_idx on public.applications (status);
create index applications_track_idx on public.applications (track);
create index applications_submitted_at_idx on public.applications (submitted_at desc);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  scores jsonb not null default '{}'::jsonb,
  overall int not null check (overall between 1 and 5),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, reviewer_id)
);
create index reviews_application_idx on public.reviews (application_id);

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null,
  species text not null,
  palette jsonb not null,
  traits jsonb not null default '{}'::jsonb,
  music jsonb not null,
  xp int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- helpers ------------------------------------------------------------------

create or replace function public.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'organizer'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger applications_set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();
create trigger pets_set_updated_at before update on public.pets
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- applicants must not change their own role
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not public.is_organizer() then
    raise exception 'role is read-only';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- applicants may only edit drafts, and may only move draft -> submitted
create or replace function public.protect_application_transition()
returns trigger
language plpgsql
as $$
begin
  if public.is_organizer() then
    return new;
  end if;
  if old.status <> 'draft' then
    raise exception 'application is locked after submission';
  end if;
  if new.status not in ('draft', 'submitted') then
    raise exception 'applicants cannot set decisions';
  end if;
  if new.status = 'submitted' and new.submitted_at is null then
    new.submitted_at = now();
  end if;
  return new;
end;
$$;

create trigger applications_protect_transition before update on public.applications
  for each row execute function public.protect_application_transition();

-- row level security -------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.reviews enable row level security;
alter table public.pets enable row level security;

create policy "profiles: read own or organizer"
  on public.profiles for select
  using (id = auth.uid() or public.is_organizer());

create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "applications: applicant reads own"
  on public.applications for select
  using (user_id = auth.uid() or public.is_organizer());

create policy "applications: applicant inserts own draft"
  on public.applications for insert
  with check (user_id = auth.uid() and status = 'draft');

create policy "applications: applicant edits own draft"
  on public.applications for update
  using (user_id = auth.uid() and status = 'draft')
  with check (user_id = auth.uid());

create policy "applications: organizer updates"
  on public.applications for update
  using (public.is_organizer())
  with check (public.is_organizer());

create policy "applications: applicant deletes own draft"
  on public.applications for delete
  using (user_id = auth.uid() and status = 'draft');

create policy "reviews: organizer only"
  on public.reviews for all
  using (public.is_organizer())
  with check (public.is_organizer() and reviewer_id = auth.uid());

create policy "pets: owner or organizer reads"
  on public.pets for select
  using (user_id = auth.uid() or public.is_organizer());

create policy "pets: owner inserts"
  on public.pets for insert
  with check (user_id = auth.uid());

create policy "pets: owner updates"
  on public.pets for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- organizer-facing summary: reviews aggregated per application
create or replace view public.application_review_summary
with (security_invoker = true) as
select
  a.id as application_id,
  count(r.id)::int as review_count,
  round(avg(r.overall)::numeric, 2) as avg_overall
from public.applications a
left join public.reviews r on r.application_id = a.id
group by a.id;
