#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL or SUPABASE_DB_URL. Copy the Supabase direct/Postgres connection string and run:');
  console.error('DATABASE_URL="postgresql://postgres...." node supabase/seeds/imports/import_activityspots_direct_20260426.mjs');
  process.exit(1);
}

const repo = '/Users/kasparszemitis/pycharm/gokiddo/famactify';
const datasets = [
  ['Bay Area events', path.join(repo, 'supabase/seeds/scrapes/bay_area_activityspots_scrape_20260425.json')],
  ['Bay Area hikes', path.join(repo, 'supabase/seeds/scrapes/bay_area_hikes_activityspots_scrape_20260425.json')],
  ['Latvia activities', path.join(repo, 'supabase/seeds/scrapes/latvia_activityspots_scrape_20260425.json')],
];

const columns = [
  'id', 'name', 'description', 'activity_type', 'age_buckets', 'min_price', 'max_price',
  'location_address', 'location_lat', 'location_lon', 'location_environment',
  'accessibility_wheelchair', 'accessibility_stroller', 'facilities_restrooms', 'facilities_changingtable',
  'schedule_openinghours', 'duration_minutes', 'imageurlthumb', 'urlmoreinfo',
  'trail_lengthkm', 'trail_durationminutes', 'trail_routetype',
  'event_starttime', 'event_endtime', 'ticket_url', 'organizer',
  'foodvenue_kidmenu', 'foodvenue_kidcorner', 'foodvenue_kidamenities',
  'schema_version', 'source', 'json',
  'primary_category', 'subtype', 'involvement', 'city', 'age_min', 'age_max', 'duration_max_minutes',
  'booking_required', 'tags', 'season', 'rain_suitable', 'highlights', 'excitement_score', 'image_urls',
  'country_code', 'sensory_friendly', 'transit_accessible', 'fenced',
  'source_url', 'source_confidence', 'family_fit_score',
];

function normalize(row) {
  const out = {};
  for (const column of columns) out[column] = row[column] ?? null;
  for (const column of ['activity_type', 'age_buckets', 'tags', 'season', 'highlights', 'image_urls']) {
    out[column] = Array.isArray(row[column]) ? row[column] : [];
  }
  out.source = row.source ?? 'codex_scrape';
  out.json = row.json ?? row;
  return out;
}

const sql = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

try {
  let total = 0;
  for (const [label, file] of datasets) {
    const rows = JSON.parse(await fs.readFile(file, 'utf8')).map(normalize);
    console.log(`Importing ${label}: ${rows.length} rows`);
    for (let index = 0; index < rows.length; index += 100) {
      const chunk = rows.slice(index, index + 100);
      await sql.begin(async (tx) => {
        await tx`
          insert into public.activityspots ${tx(chunk, columns)}
          on conflict (id) do update set
            name = excluded.name,
            description = excluded.description,
            activity_type = excluded.activity_type,
            age_buckets = excluded.age_buckets,
            min_price = excluded.min_price,
            max_price = excluded.max_price,
            location_address = excluded.location_address,
            location_lat = excluded.location_lat,
            location_lon = excluded.location_lon,
            location_environment = excluded.location_environment,
            accessibility_wheelchair = excluded.accessibility_wheelchair,
            accessibility_stroller = excluded.accessibility_stroller,
            facilities_restrooms = excluded.facilities_restrooms,
            facilities_changingtable = excluded.facilities_changingtable,
            schedule_openinghours = excluded.schedule_openinghours,
            duration_minutes = excluded.duration_minutes,
            imageurlthumb = excluded.imageurlthumb,
            urlmoreinfo = excluded.urlmoreinfo,
            trail_lengthkm = excluded.trail_lengthkm,
            trail_durationminutes = excluded.trail_durationminutes,
            trail_routetype = excluded.trail_routetype,
            event_starttime = excluded.event_starttime,
            event_endtime = excluded.event_endtime,
            ticket_url = excluded.ticket_url,
            organizer = excluded.organizer,
            foodvenue_kidmenu = excluded.foodvenue_kidmenu,
            foodvenue_kidcorner = excluded.foodvenue_kidcorner,
            foodvenue_kidamenities = excluded.foodvenue_kidamenities,
            schema_version = excluded.schema_version,
            source = excluded.source,
            json = excluded.json,
            primary_category = excluded.primary_category,
            subtype = excluded.subtype,
            involvement = excluded.involvement,
            city = excluded.city,
            age_min = excluded.age_min,
            age_max = excluded.age_max,
            duration_max_minutes = excluded.duration_max_minutes,
            booking_required = excluded.booking_required,
            tags = excluded.tags,
            season = excluded.season,
            rain_suitable = excluded.rain_suitable,
            highlights = excluded.highlights,
            excitement_score = excluded.excitement_score,
            image_urls = excluded.image_urls,
            country_code = excluded.country_code,
            sensory_friendly = excluded.sensory_friendly,
            transit_accessible = excluded.transit_accessible,
            fenced = excluded.fenced,
            source_url = excluded.source_url,
            source_confidence = excluded.source_confidence,
            family_fit_score = excluded.family_fit_score,
            updated_at = now()
        `;
      });
      total += chunk.length;
      console.log(`  imported ${Math.min(index + chunk.length, rows.length)}/${rows.length}`);
    }
  }
  console.log(`Done. Imported/upserted ${total} rows.`);
} finally {
  await sql.end();
}
