import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = "/Users/kasparszemitis/pycharm/gokiddo/famactify/supabase/seeds/scrapes";
const CHECKED_AT = "2026-04-26T12:55:00-07:00";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const FILES = {
  bayEvents: path.join(OUT_DIR, "bay_area_activityspots_scrape_20260425.json"),
  bayHikes: path.join(OUT_DIR, "bay_area_hikes_activityspots_scrape_20260425.json"),
  latvia: path.join(OUT_DIR, "latvia_activityspots_scrape_20260425.json"),
  summary: path.join(OUT_DIR, "activity_attribute_enrichment_sources_20260426.json"),
};

const allowedTags = new Set([
  "editors-pick", "rainy-day", "free", "under-$10", "under-$20", "weekend-special", "summer-pick",
  "stroller-friendly", "wheelchair-accessible", "parking-easy", "close-to-bart", "food-nearby", "booking-needed-advance",
  "animals", "science", "art", "music", "cooking", "water", "climbing", "nature", "sports", "theatre", "reading", "building", "trains", "dinosaurs", "space",
  "toddler", "preschool", "elementary", "teen", "all-ages",
  "indoor", "outdoor", "both-indoor-outdoor", "beach", "forest", "urban", "farm",
  "sensory-friendly", "transit-friendly", "nursing-friendly", "food-available", "picnic-friendly", "shade", "fenced", "sibling-friendly", "carrier-friendly", "low-cost", "memberships-accepted", "drop-in", "reservation-required",
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function overpass(query) {
  let lastError = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": "FamActifyDataBot/0.1 (+https://famactify.app; source-linked enrichment)",
        },
        body: new URLSearchParams({ data: query }),
      });
      const text = await response.text();
      if (response.ok) return JSON.parse(text);
      lastError = new Error(`${response.status} ${response.statusText}: ${text.slice(0, 300)}`);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function osmUrl(type, id) {
  return `https://www.openstreetmap.org/${type}/${id}`;
}

function parseExternalId(record) {
  const external = record.json?.source_metadata?.external_id || "";
  const match = String(external).match(/^(node|way|relation)\/(\d+)$/);
  if (match) return { type: match[1], id: Number(match[2]) };
  const idMatch = record.id.match(/(node|way|relation)-(\d+)$/);
  if (idMatch) return { type: idMatch[1], id: Number(idMatch[2]) };
  return null;
}

function haversineKm(a, b) {
  const radius = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function geometryLengthKm(geometry = []) {
  let total = 0;
  for (let index = 1; index < geometry.length; index += 1) {
    total += haversineKm(geometry[index - 1], geometry[index]);
  }
  return total;
}

function addEvidence(record, evidence) {
  record.json ??= {};
  record.json.source_metadata ??= {};
  record.json.source_metadata.source_evidence ??= [];
  record.json.source_metadata.source_evidence.push({
    ...evidence,
    source_checked_at: CHECKED_AT,
  });
}

function addTag(record, tag) {
  if (!allowedTags.has(tag)) return;
  record.tags = [...new Set([...(record.tags || []), tag])].sort();
}

function mirror(record) {
  const sourceMetadata = record.json?.source_metadata;
  record.json = { ...record };
  if (sourceMetadata) record.json.source_metadata = sourceMetadata;
}

function amenityFromNearby(record, nearby) {
  const tags = nearby.tags || {};
  const url = osmUrl(nearby.type, nearby.id);
  if (tags.amenity === "toilets") {
    if (record.facilities_restrooms !== true) {
      record.facilities_restrooms = true;
      addEvidence(record, { field: "facilities_restrooms", value: `Nearby OSM toilets: ${tags.name || nearby.id}`, source_url: url });
    }
    if (tags.changing_table === "yes" || tags.changing_table === "limited") {
      record.facilities_changingtable = true;
      addEvidence(record, { field: "facilities_changingtable", value: `Nearby OSM toilets changing_table=${tags.changing_table}`, source_url: url });
    }
    if (tags.wheelchair === "yes") {
      record.accessibility_wheelchair = true;
      addTag(record, "wheelchair-accessible");
      addEvidence(record, { field: "accessibility_wheelchair", value: "Nearby OSM toilets wheelchair=yes", source_url: url });
    }
  }
  if (tags.amenity === "parking") {
    addTag(record, "parking-easy");
    addEvidence(record, { field: "tags", value: "parking-easy from nearby OSM parking", source_url: url });
  }
  if (tags.highway === "bus_stop" || tags.public_transport === "platform" || tags.railway === "station" || tags.railway === "tram_stop" || tags.amenity === "bus_station") {
    if (record.transit_accessible !== true) {
      record.transit_accessible = true;
      addTag(record, "transit-friendly");
      addEvidence(record, { field: "transit_accessible", value: `Nearby OSM transit stop: ${tags.name || nearby.id}`, source_url: url });
    }
  }
}

function applyObjectTags(record, element) {
  const tags = element.tags || {};
  const url = osmUrl(element.type, element.id);
  if (tags.fenced === "yes" || tags.barrier === "fence") {
    record.fenced = true;
    addTag(record, "fenced");
    addEvidence(record, { field: "fenced", value: tags.fenced ? `OSM fenced=${tags.fenced}` : `OSM barrier=${tags.barrier}`, source_url: url });
  }
  if (tags.shade === "yes" || tags.covered === "yes") {
    addTag(record, tags.shade === "yes" ? "shade" : "rainy-day");
    addEvidence(record, { field: "tags", value: tags.shade === "yes" ? "shade" : "rainy-day", source_url: url });
  }
  if (tags.toilets === "yes") {
    record.facilities_restrooms = true;
    addEvidence(record, { field: "facilities_restrooms", value: "OSM toilets=yes", source_url: url });
  }
  if (tags.changing_table === "yes" || tags.changing_table === "limited") {
    record.facilities_changingtable = true;
    addEvidence(record, { field: "facilities_changingtable", value: `OSM changing_table=${tags.changing_table}`, source_url: url });
  }
  if (tags.wheelchair === "yes") {
    record.accessibility_wheelchair = true;
    addTag(record, "wheelchair-accessible");
    addEvidence(record, { field: "accessibility_wheelchair", value: "OSM wheelchair=yes", source_url: url });
  }
  if (tags.stroller === "yes" || tags.pram === "yes") {
    record.accessibility_stroller = true;
    addTag(record, "stroller-friendly");
    addEvidence(record, { field: "accessibility_stroller", value: tags.stroller ? "OSM stroller=yes" : "OSM pram=yes", source_url: url });
  }
  if (tags.sensory === "yes" || tags["sensory_friendly"] === "yes" || tags["sensory-friendly"] === "yes") {
    record.sensory_friendly = true;
    addTag(record, "sensory-friendly");
    addEvidence(record, { field: "sensory_friendly", value: "OSM sensory-friendly tag", source_url: url });
  }
}

async function enrichHikeLengths(records, stats) {
  const wayRecords = records
    .map((record) => ({ record, osm: parseExternalId(record) }))
    .filter(({ osm }) => osm?.type === "way");
  for (let index = 0; index < wayRecords.length; index += 80) {
    const batch = wayRecords.slice(index, index + 80);
    const ids = batch.map(({ osm }) => osm.id).join(",");
    console.log(`Fetching trail geometry ${index + 1}-${index + batch.length}/${wayRecords.length}`);
    const data = await overpass(`[out:json][timeout:120];way(id:${ids});out geom tags;`);
    const byId = new Map(data.elements.map((element) => [element.id, element]));
    for (const { record, osm } of batch) {
      const element = byId.get(osm.id);
      if (!element) continue;
      applyObjectTags(record, element);
      const lengthKm = geometryLengthKm(element.geometry || []);
      if (lengthKm > 0) {
        record.trail_lengthkm = Number(lengthKm.toFixed(2));
        const minutes = Math.max(20, Math.round((lengthKm / 3.2) * 60));
        record.trail_durationminutes = minutes;
        record.duration_minutes = minutes;
        record.duration_max_minutes = Math.max(minutes, Math.round(minutes * 1.4));
        addEvidence(record, { field: "trail_lengthkm", value: `${record.trail_lengthkm} km computed from OSM way geometry`, source_url: osmUrl("way", osm.id) });
        stats.hikeTrailLengths += 1;
      }
    }
    await sleep(800);
  }
}

async function fetchNearbyAmenities(records, radiusMeters, statsKey, stats) {
  for (let index = 0; index < records.length; index += 50) {
    const batch = records.slice(index, index + 50);
    console.log(`Fetching nearby amenities ${statsKey} ${index + 1}-${index + batch.length}/${records.length}`);
    const aroundParts = batch
      .map((record, offset) => {
        if (!Number.isFinite(record.location_lat) || !Number.isFinite(record.location_lon)) return "";
        return `
          node(around:${radiusMeters},${record.location_lat},${record.location_lon})["amenity"~"^(toilets|parking|bus_station)$"];
          node(around:${radiusMeters},${record.location_lat},${record.location_lon})["highway"="bus_stop"];
          node(around:${radiusMeters},${record.location_lat},${record.location_lon})["public_transport"="platform"];
          node(around:${radiusMeters},${record.location_lat},${record.location_lon})["railway"~"^(station|tram_stop|halt)$"];
        `;
      })
      .join("\n");
    const data = await overpass(`[out:json][timeout:120];(${aroundParts});out center tags;`);
    const amenities = data.elements || [];
    for (const record of batch) {
      const before = {
        restrooms: record.facilities_restrooms,
        changing: record.facilities_changingtable,
        transit: record.transit_accessible,
        tags: JSON.stringify(record.tags || []),
      };
      for (const nearby of amenities) {
        const lat = nearby.lat ?? nearby.center?.lat;
        const lon = nearby.lon ?? nearby.center?.lon;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        const distanceMeters = haversineKm({ lat: record.location_lat, lon: record.location_lon }, { lat, lon }) * 1000;
        if (distanceMeters <= radiusMeters) amenityFromNearby(record, nearby);
      }
      const after = {
        restrooms: record.facilities_restrooms,
        changing: record.facilities_changingtable,
        transit: record.transit_accessible,
        tags: JSON.stringify(record.tags || []),
      };
      if (JSON.stringify(before) !== JSON.stringify(after)) stats[statsKey] += 1;
    }
    await sleep(800);
  }
}

async function refreshLatviaObjects(records, stats) {
  const groups = new Map();
  for (const record of records) {
    const osm = parseExternalId(record);
    if (!osm) continue;
    if (!groups.has(osm.type)) groups.set(osm.type, []);
    groups.get(osm.type).push({ record, osm });
  }
  for (const [type, items] of groups.entries()) {
    for (let index = 0; index < items.length; index += 100) {
      const batch = items.slice(index, index + 100);
      const ids = batch.map(({ osm }) => osm.id).join(",");
      console.log(`Refreshing Latvia ${type} tags ${index + 1}-${index + batch.length}/${items.length}`);
      const data = await overpass(`[out:json][timeout:120];${type}(id:${ids});out center tags;`);
      const byId = new Map(data.elements.map((element) => [element.id, element]));
      for (const { record, osm } of batch) {
        const before = JSON.stringify({
          fenced: record.fenced,
          restrooms: record.facilities_restrooms,
          changing: record.facilities_changingtable,
          wheelchair: record.accessibility_wheelchair,
          stroller: record.accessibility_stroller,
          sensory: record.sensory_friendly,
          tags: record.tags,
        });
        const element = byId.get(osm.id);
        if (!element) continue;
        applyObjectTags(record, element);
        const after = JSON.stringify({
          fenced: record.fenced,
          restrooms: record.facilities_restrooms,
          changing: record.facilities_changingtable,
          wheelchair: record.accessibility_wheelchair,
          stroller: record.accessibility_stroller,
          sensory: record.sensory_friendly,
          tags: record.tags,
        });
        if (before !== after) stats.latviaDirectTagEnriched += 1;
      }
      await sleep(800);
    }
  }
}

function countFilled(rows, fields) {
  const out = {};
  for (const field of fields) {
    out[field] = rows.filter((row) => row[field] !== undefined && row[field] !== null && !(Array.isArray(row[field]) && row[field].length === 0)).length;
  }
  return out;
}

async function main() {
  const bayEvents = JSON.parse(await fs.readFile(FILES.bayEvents, "utf8"));
  const bayHikes = JSON.parse(await fs.readFile(FILES.bayHikes, "utf8"));
  const latvia = JSON.parse(await fs.readFile(FILES.latvia, "utf8"));
  const stats = {
    generated_at: CHECKED_AT,
    sources: {
      openstreetmap: "https://www.openstreetmap.org/",
      overpass: OVERPASS_ENDPOINTS,
    },
    hikeTrailLengths: 0,
    hikeNearbyAmenityEnriched: 0,
    latviaDirectTagEnriched: 0,
    latviaNearbyAmenityEnriched: 0,
    bayEventsReviewed: bayEvents.length,
    notes: [
      "Only positive source-supported values were added. Missing source evidence remains null.",
      "Trail length is computed from OSM way geometry; it is segment length, not necessarily a full curated hike route.",
      "Nearby amenities are OSM nodes within the stated radius and should be reviewed before import.",
    ],
  };

  await enrichHikeLengths(bayHikes, stats);
  await fetchNearbyAmenities(bayHikes, 250, "hikeNearbyAmenityEnriched", stats);
  await refreshLatviaObjects(latvia, stats);
  await fetchNearbyAmenities(latvia, 150, "latviaNearbyAmenityEnriched", stats);

  for (const record of [...bayEvents, ...bayHikes, ...latvia]) {
    record.enriched_at = CHECKED_AT;
    mirror(record);
  }

  stats.final_counts = {
    bayEvents: countFilled(bayEvents, ["facilities_restrooms", "facilities_changingtable", "sensory_friendly", "fenced", "foodvenue_kidamenities", "foodvenue_kidcorner", "foodvenue_kidmenu"]),
    bayHikes: countFilled(bayHikes, ["trail_lengthkm", "trail_durationminutes", "facilities_restrooms", "facilities_changingtable", "transit_accessible", "fenced", "sensory_friendly"]),
    latvia: countFilled(latvia, ["facilities_restrooms", "facilities_changingtable", "transit_accessible", "fenced", "sensory_friendly", "accessibility_wheelchair", "accessibility_stroller"]),
  };

  await fs.writeFile(FILES.bayEvents, `${JSON.stringify(bayEvents, null, 2)}\n`);
  await fs.writeFile(FILES.bayHikes, `${JSON.stringify(bayHikes, null, 2)}\n`);
  await fs.writeFile(FILES.latvia, `${JSON.stringify(latvia, null, 2)}\n`);
  await fs.writeFile(FILES.summary, `${JSON.stringify(stats, null, 2)}\n`);
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
