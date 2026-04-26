import fs from 'node:fs';
import path from 'node:path';

const repo = '/Users/kasparszemitis/pycharm/gokiddo/famactify';
const outDir = path.join(repo, 'supabase/seeds/imports');

const sources = [
  {
    input: path.join(repo, 'supabase/seeds/scrapes/bay_area_activityspots_scrape_20260425.json'),
    output: path.join(outDir, 'import_activityspots_20260426_01_bay_area_events.sql'),
    label: 'Bay Area official library/event activities',
  },
  {
    input: path.join(repo, 'supabase/seeds/scrapes/bay_area_hikes_activityspots_scrape_20260425.json'),
    output: path.join(outDir, 'import_activityspots_20260426_02_bay_area_hikes.sql'),
    label: 'Bay Area OSM hikes/trails',
  },
  {
    input: path.join(repo, 'supabase/seeds/scrapes/latvia_activityspots_scrape_20260425.json'),
    output: path.join(outDir, 'import_activityspots_20260426_03_latvia_activities.sql'),
    label: 'Latvia OSM activities',
  },
];

const dbColumns = [
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
  'created_by', 'created_by_reference', 'urlmoreinfo_status',
];

const recordsetColumns = [
  'id text', 'name text', 'description text', 'activity_type text[]', 'age_buckets text[]',
  'min_price double precision', 'max_price double precision', 'location_address text',
  'location_lat double precision', 'location_lon double precision', 'location_environment text',
  'accessibility_wheelchair boolean', 'accessibility_stroller boolean', 'facilities_restrooms boolean',
  'facilities_changingtable boolean', 'schedule_openinghours jsonb', 'duration_minutes int',
  'imageurlthumb text', 'urlmoreinfo text', 'trail_lengthkm double precision',
  'trail_durationminutes int', 'trail_routetype text', 'event_starttime timestamptz',
  'event_endtime timestamptz', 'ticket_url text', 'organizer text', 'foodvenue_kidmenu boolean',
  'foodvenue_kidcorner boolean', 'foodvenue_kidamenities boolean', 'schema_version text',
  'source text', 'json jsonb', 'primary_category text', 'subtype text', 'involvement text',
  'city text', 'age_min smallint', 'age_max smallint', 'duration_max_minutes int',
  'booking_required boolean', 'tags text[]', 'season text[]', 'rain_suitable boolean',
  'highlights text[]', 'excitement_score smallint', 'image_urls text[]', 'country_code text',
  'sensory_friendly boolean', 'transit_accessible boolean', 'fenced boolean', 'source_url text',
  'source_confidence smallint', 'family_fit_score smallint', 'created_by text',
  'created_by_reference jsonb', 'urlmoreinfo_status text',
];

function normalize(row) {
  const out = {};
  for (const col of dbColumns) out[col] = row[col] ?? null;
  out.activity_type = Array.isArray(row.activity_type) ? row.activity_type : [];
  out.age_buckets = Array.isArray(row.age_buckets) ? row.age_buckets : [];
  out.tags = Array.isArray(row.tags) ? row.tags : [];
  out.season = Array.isArray(row.season) ? row.season : [];
  out.highlights = Array.isArray(row.highlights) ? row.highlights : [];
  out.image_urls = Array.isArray(row.image_urls) ? row.image_urls : [];
  out.schedule_openinghours = row.schedule_openinghours ?? null;
  out.source = row.source ?? 'codex_scrape';
  out.json = row.json ?? row;
  out.created_by = 'crawler_codex';
  out.created_by_reference = {
    task_id: 'TASK-20260426-121',
    generator: 'generate_activity_import_sql_20260426.mjs',
    source: out.source,
    source_url: row.source_url ?? row.urlmoreinfo ?? null,
  };
  out.urlmoreinfo_status = 'unknown';
  return out;
}

function dollarQuote(json) {
  const tags = ['$famactify$', '$famactify1$', '$famactify2$'];
  const tag = tags.find((candidate) => !json.includes(candidate));
  if (!tag) throw new Error('Could not find safe dollar quote tag');
  return `${tag}${json}${tag}`;
}

function renderSql({ label, rows }) {
  const payload = JSON.stringify(rows.map(normalize));
  const insertColumns = dbColumns.map((column) => `  ${column}`).join(',\n');
  const selectColumns = dbColumns.map((column) => `  ${column}`).join(',\n');
  const updateColumns = dbColumns
    .filter((column) => column !== 'id')
    .map((column) => `  ${column} = EXCLUDED.${column}`)
    .join(',\n');

  return `-- FamActify activityspots import: ${label}\n-- Generated: 2026-04-26\n-- Source records: ${rows.length}\n-- Safe to rerun: uses ON CONFLICT (id) DO UPDATE.\n\nBEGIN;\n\nWITH payload AS (\n  SELECT ${dollarQuote(payload)}::jsonb AS data\n), rows AS (\n  SELECT x.*\n  FROM payload, jsonb_to_recordset(payload.data) AS x(\n    ${recordsetColumns.join(',\n    ')}\n  )\n)\nINSERT INTO public.activityspots (\n${insertColumns}\n)\nSELECT\n${selectColumns}\nFROM rows\nON CONFLICT (id) DO UPDATE SET\n${updateColumns},\n  updated_at = now();\n\nCOMMIT;\n`;
}

const manifest = [];
for (const source of sources) {
  const rows = JSON.parse(fs.readFileSync(source.input, 'utf8'));
  fs.writeFileSync(source.output, renderSql({ label: source.label, rows }));
  manifest.push({
    file: path.relative(repo, source.output),
    source: path.relative(repo, source.input),
    label: source.label,
    rows: rows.length,
    size_bytes: fs.statSync(source.output).size,
  });
}

const readme = `# FamActify Activity Import SQL — 2026-04-26\n\nRun migrations/preflight first, then run the import files in Supabase SQL editor.\n\n## Migration / preflight\n\nIf your Supabase project has applied all migrations through \`20260426_100000_add_event_fields.sql\`, no new migration is required.\n\nIf unsure, run this idempotent preflight first:\n\n- \`supabase/seeds/imports/00_activityspots_import_preflight_20260426.sql\`\n\nImportant existing migrations covered by the preflight/import shape:\n\n1. \`supabase/migrations/20251129220601_a00cce1c-266e-48ea-8e29-4683839b6d5f.sql\`\n2. \`supabase/migrations/20251203181002_4e43d184-72ae-469f-8576-5f6a194e35b3.sql\` — adds \`source\`\n3. \`supabase/migrations/20260425_160000_extend_activityspots_for_discovery.sql\`\n4. \`supabase/migrations/20260425_170000_add_country_code.sql\`\n5. \`supabase/migrations/20260425_190000_extend_activityspots_v32_attributes.sql\`\n6. \`supabase/migrations/20260426_100000_add_event_fields.sql\`\n\n## Import order\n\n${manifest.map((m, index) => `${index + 1}. \`${m.file}\` — ${m.label}, ${m.rows} rows, ${(m.size_bytes / 1024 / 1024).toFixed(1)} MB`).join('\n')}\n\nEach import uses \`ON CONFLICT (id) DO UPDATE\`, so it is safe to rerun after review.\n\n## Source datasets\n\n${manifest.map((m) => `- \`${m.source}\``).join('\n')}\n`;

fs.writeFileSync(path.join(outDir, 'README-import-activityspots-20260426.md'), readme);
fs.writeFileSync(path.join(outDir, 'import_activityspots_20260426_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
