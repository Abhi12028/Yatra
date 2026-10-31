-- Trip + cars only. People add themselves in the app with the trip code.
-- Departure time is IST.
with t as (
  insert into trips (name, code, starts_at)
  values ('Pune → Tirupati', '0911', '2026-11-09 05:00:00+05:30') returning id
)
insert into cars (trip_id, name, color, kind)
select id, x.name, x.color, x.kind from t, (values ('Triber', '#D9701E', 'mpv'), ('Swift', '#0F7C7A', 'hatch')) x(name, color, kind);
