create extension if not exists pgcrypto;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_session_hash text,
  name text not null default 'Untitled',
  cover_asset_id uuid,
  viewport jsonb not null default '{"x":0,"y":0,"zoom":1}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_one_owner check ((user_id is not null)::int + (guest_session_hash is not null)::int = 1)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null check (role in ('user', 'agent', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  asset_type text not null check (asset_type in ('reference_image', 'uploaded_image', 'generated_image')),
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

alter table public.projects
  add constraint projects_cover_asset_id_fkey foreign key (cover_asset_id) references public.assets(id) on delete set null;

create table public.canvas_nodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  node_type text not null check (node_type in ('generated_image', 'uploaded_image')),
  position jsonb not null,
  size jsonb not null,
  asset_id uuid not null references public.assets(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.generation_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  provider text not null,
  model text not null,
  task_type text not null check (task_type in ('text_to_image', 'image_to_image')),
  provider_task_id text,
  status text not null check (status in ('queued', 'processing', 'succeeded', 'failed')),
  prompt text not null,
  parameters jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_updated_at_idx on public.projects(updated_at desc);
create index projects_guest_session_hash_idx on public.projects(guest_session_hash);
create index messages_project_created_idx on public.messages(project_id, created_at);
create index canvas_nodes_project_idx on public.canvas_nodes(project_id);
create index generation_tasks_project_created_idx on public.generation_tasks(project_id, created_at);
create index generation_tasks_provider_task_idx on public.generation_tasks(provider_task_id);
create index assets_project_idx on public.assets(project_id);

alter table public.projects enable row level security;
alter table public.messages enable row level security;
alter table public.assets enable row level security;
alter table public.canvas_nodes enable row level security;
alter table public.generation_tasks enable row level security;

create policy "users own projects" on public.projects for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users own messages" on public.messages for all using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy "users own assets" on public.assets for all using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy "users own canvas nodes" on public.canvas_nodes for all using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));
create policy "users own generation tasks" on public.generation_tasks for all using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

insert into storage.buckets (id, name, public)
values ('ai-images', 'ai-images', false)
on conflict (id) do update set public = false;
