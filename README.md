# Yatra — family trip app (Pune → Tirupati, 9 Nov 2026)

## Database lives in code
- Tables: `supabase/migrations/*.sql` (one file per change, never edit an applied one)
- Auth settings: Supabase dashboard (anonymous sign-ins must be ON)
- Family names/cars: `supabase/seed.sql`

One-time, per laptop:

    npx supabase login       # opens browser
    npm run db:link          # asks for the database password

Every time the database changes:

    npm run db:new add_locations   # creates supabase/migrations/<timestamp>_add_locations.sql — write SQL in it
    npm run db:push                # applies new migrations to Supabase

## Run
    cp .env.example .env     # Project URL + publishable key
    npm install
    npm run dev              # phones on same Wi-Fi: open the Network URL, e.g. https://10.176.132.140:5173/

The dev server is HTTPS only (phones block GPS on plain http). It uses a self-signed
certificate, so the browser warns once: tap Advanced → Proceed, then allow location.

## Android APK (needs Android Studio)
    npm run build && npx cap add android && npx cap open android

## Forgot PIN (run in Supabase SQL Editor)
    update member_pins set pin_hash = extensions.crypt('1234', extensions.gen_salt('bf')), fails = 0, locked_until = null
    where member_id = (select id from members where name = 'Their Name');
Then tell them their PIN is 1234.
