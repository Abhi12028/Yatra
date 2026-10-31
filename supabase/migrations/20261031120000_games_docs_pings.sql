-- Prototype v4 → app: game points (Triber vs Swift), pings between cars, shared packing list, documents.

-- One row per point scored; the scoreboard is a sum.
create table game_points (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  car_id uuid not null references cars on delete cascade,
  game text not null check (game in ('antakshari', 'bingo', 'quiz', 'charades')),
  what text not null check (length(what) between 1 and 80),
  points int not null check (points between 1 and 5),
  created_by uuid references members on delete set null,
  created_at timestamptz not null default now()
);
alter table game_points enable row level security;
create policy "own trip" on game_points for select using (trip_id = my_trip_id());
create policy "insert own" on game_points for insert with check (trip_id = my_trip_id() and created_by = my_member_id());

-- "Chai stop", "Fuel"… sent from one car to the other; the other car taps OK.
create table pings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  from_car uuid not null references cars on delete cascade,
  emoji text not null check (length(emoji) <= 8),
  msg text not null check (length(msg) between 1 and 40),
  ack_by text check (length(ack_by) <= 30),
  created_by uuid references members on delete set null,
  created_at timestamptz not null default now()
);
create index pings_trip on pings (trip_id, created_at desc);
alter table pings enable row level security;
create policy "own trip" on pings for select using (trip_id = my_trip_id());
create policy "insert own" on pings for insert with check (trip_id = my_trip_id() and created_by = my_member_id());
create policy "ack trip" on pings for update using (trip_id = my_trip_id()) with check (trip_id = my_trip_id());

-- Shared packing list; packed_by is the name of whoever ticked it.
create table pack_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  title text not null check (length(trim(title)) between 1 and 60),
  note text not null default '' check (length(note) <= 80),
  packed_by text check (length(packed_by) <= 30),
  created_at timestamptz not null default now()
);
alter table pack_items enable row level security;
create policy "own trip" on pack_items for select using (trip_id = my_trip_id());
create policy "insert trip" on pack_items for insert with check (trip_id = my_trip_id());
create policy "update trip" on pack_items for update using (trip_id = my_trip_id()) with check (trip_id = my_trip_id());
create policy "delete trip" on pack_items for delete using (trip_id = my_trip_id());

insert into pack_items (trip_id, title, note, created_at)
select t.id, x.title, x.note, now() + (x.n || ' ms')::interval
from trips t, (values
  (1, 'Aadhaar originals for all 14', 'TTD checks ID at darshan'),
  (2, 'Darshan dress', 'Dhoti or kurta-pyjama; saree or churidar with dupatta'),
  (3, 'Shawls / sweaters', 'Tirumala is cold before dawn in November'),
  (4, 'Motion-sickness tablets', 'For the ghat roads'),
  (5, 'Cash in small notes', 'Small towns, temple counters, chai'),
  (6, 'Phone chargers + power bank', 'One car charger per car'),
  (7, 'Water bottles & snacks', 'For both cars'),
  (8, 'Torch', 'Night halts and early darshan queues')
) as x(n, title, note)
where t.code = '0911';

-- Documents: Aadhaar per person, papers per car, tickets and bookings. Files live in the private "docs" bucket under <trip_id>/.
create table docs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  kind text not null check (kind in ('aadhaar', 'car', 'ticket', 'booking')),
  member_id uuid references members on delete cascade,
  car_id uuid references cars on delete cascade,
  title text not null check (length(trim(title)) between 1 and 60),
  note text not null default '' check (length(note) <= 80),
  expires_on date,
  path text not null check (path like trip_id::text || '/%'),
  created_by uuid references members on delete set null,
  created_at timestamptz not null default now()
);
alter table docs enable row level security;
create policy "own trip" on docs for select using (trip_id = my_trip_id());
create policy "insert own" on docs for insert with check (trip_id = my_trip_id() and created_by = my_member_id());
create policy "delete trip" on docs for delete using (trip_id = my_trip_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('docs', 'docs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']);
create policy "docs own trip read" on storage.objects for select using (bucket_id = 'docs' and (storage.foldername(name))[1] = my_trip_id()::text);
create policy "docs own trip write" on storage.objects for insert with check (bucket_id = 'docs' and (storage.foldername(name))[1] = my_trip_id()::text);
create policy "docs own trip delete" on storage.objects for delete using (bucket_id = 'docs' and (storage.foldername(name))[1] = my_trip_id()::text);

alter publication supabase_realtime add table game_points, pings, pack_items, docs;
