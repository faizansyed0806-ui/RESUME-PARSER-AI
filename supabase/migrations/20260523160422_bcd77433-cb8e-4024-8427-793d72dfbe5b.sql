
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Candidates
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  location text,
  title text,
  summary text,
  skills jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  years_experience numeric,
  resume_score integer not null default 0,
  resume_path text,
  file_name text,
  parsed_json jsonb,
  source_text text,
  created_at timestamptz not null default now()
);
create index candidates_user_idx on public.candidates(user_id);
alter table public.candidates enable row level security;
create policy "own candidates select" on public.candidates for select using (auth.uid() = user_id);
create policy "own candidates insert" on public.candidates for insert with check (auth.uid() = user_id);
create policy "own candidates update" on public.candidates for update using (auth.uid() = user_id);
create policy "own candidates delete" on public.candidates for delete using (auth.uid() = user_id);

-- Jobs
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  required_skills jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.jobs enable row level security;
create policy "own jobs all" on public.jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Matches
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  score integer not null default 0,
  breakdown jsonb,
  created_at timestamptz not null default now()
);
create index matches_job_idx on public.matches(job_id);
alter table public.matches enable row level security;
create policy "own matches all" on public.matches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for resumes (private)
insert into storage.buckets (id, name, public) values ('resumes','resumes', false)
on conflict (id) do nothing;

create policy "own resumes read"
on storage.objects for select
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "own resumes insert"
on storage.objects for insert
with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "own resumes delete"
on storage.objects for delete
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
