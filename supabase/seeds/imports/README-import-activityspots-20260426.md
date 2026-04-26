# FamActify Activity Import SQL — 2026-04-26

Run migrations/preflight first, then run the import files in Supabase SQL editor.

## Migration / preflight

If your Supabase project has applied all migrations through `20260426_100000_add_event_fields.sql`, no new migration is required.

If unsure, run this idempotent preflight first:

- `supabase/seeds/imports/00_activityspots_import_preflight_20260426.sql`

Important existing migrations covered by the preflight/import shape:

1. `supabase/migrations/20251129220601_a00cce1c-266e-48ea-8e29-4683839b6d5f.sql`
2. `supabase/migrations/20251203181002_4e43d184-72ae-469f-8576-5f6a194e35b3.sql` — adds `source`
3. `supabase/migrations/20260425_160000_extend_activityspots_for_discovery.sql`
4. `supabase/migrations/20260425_170000_add_country_code.sql`
5. `supabase/migrations/20260425_190000_extend_activityspots_v32_attributes.sql`
6. `supabase/migrations/20260426_100000_add_event_fields.sql`

## Import order

1. `supabase/seeds/imports/import_activityspots_20260426_01_bay_area_events.sql` — Bay Area official library/event activities, 1000 rows, 5.5 MB
2. `supabase/seeds/imports/import_activityspots_20260426_02_bay_area_hikes.sql` — Bay Area OSM hikes/trails, 500 rows, 2.2 MB
3. `supabase/seeds/imports/import_activityspots_20260426_03_latvia_activities.sql` — Latvia OSM activities, 500 rows, 2.2 MB

Each import uses `ON CONFLICT (id) DO UPDATE`, so it is safe to rerun after review.

## Source datasets

- `supabase/seeds/scrapes/bay_area_activityspots_scrape_20260425.json`
- `supabase/seeds/scrapes/bay_area_hikes_activityspots_scrape_20260425.json`
- `supabase/seeds/scrapes/latvia_activityspots_scrape_20260425.json`

## Smaller chunk fallback

If the Supabase SQL editor times out or rejects a larger file, run these 250-row chunks instead, in filename order:

- `supabase/seeds/imports/chunks/import_activityspots_20260426_01_bay_area_events_part01.sql`
- `supabase/seeds/imports/chunks/import_activityspots_20260426_01_bay_area_events_part02.sql`
- `supabase/seeds/imports/chunks/import_activityspots_20260426_01_bay_area_events_part03.sql`
- `supabase/seeds/imports/chunks/import_activityspots_20260426_01_bay_area_events_part04.sql`
- `supabase/seeds/imports/chunks/import_activityspots_20260426_02_bay_area_hikes_part01.sql`
- `supabase/seeds/imports/chunks/import_activityspots_20260426_02_bay_area_hikes_part02.sql`
- `supabase/seeds/imports/chunks/import_activityspots_20260426_03_latvia_activities_part01.sql`
- `supabase/seeds/imports/chunks/import_activityspots_20260426_03_latvia_activities_part02.sql`
