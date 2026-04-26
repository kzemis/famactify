import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = "/Users/kasparszemitis/pycharm/gokiddo/famactify/supabase/seeds/scrapes";
const CHECKED_AT = "2026-04-25T23:59:00-07:00";
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const BAY_HIKES_TARGET = 500;
const LATVIA_TARGET = 500;

const allowedTags = new Set([
  "editors-pick", "rainy-day", "free", "under-$10", "under-$20", "weekend-special", "summer-pick",
  "stroller-friendly", "wheelchair-accessible", "parking-easy", "close-to-bart", "food-nearby", "booking-needed-advance",
  "animals", "science", "art", "music", "cooking", "water", "climbing", "nature", "sports", "theatre", "reading", "building", "trains", "dinosaurs", "space",
  "toddler", "preschool", "elementary", "teen", "all-ages",
  "indoor", "outdoor", "both-indoor-outdoor", "beach", "forest", "urban", "farm",
  "sensory-friendly", "transit-friendly", "nursing-friendly", "food-available", "picnic-friendly", "shade", "fenced", "sibling-friendly", "carrier-friendly", "low-cost", "memberships-accepted", "drop-in", "reservation-required",
]);

function stableSlug(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function getCenter(element) {
  if (Number.isFinite(element.lat) && Number.isFinite(element.lon)) return { lat: element.lat, lon: element.lon };
  if (element.center) return { lat: element.center.lat ?? null, lon: element.center.lon ?? null };
  return { lat: null, lon: null };
}

function osmUrl(element) {
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

function addressFromTags(tags, fallbackCity, countryLabel) {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const place = tags["addr:place"];
  const city = tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || tags["addr:municipality"] || tags["addr:district"] || fallbackCity;
  const postcode = tags["addr:postcode"];
  return [street || place, city, postcode, countryLabel].filter(Boolean).join(", ");
}

async function fetchOverpass(query) {
  const endpoints = [
    OVERPASS_ENDPOINT,
    "https://overpass.kumi.systems/api/interpreter",
  ];
  let lastError = null;
  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 75000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": "FamActifyDataBot/0.1 (+https://famactify.app; source-linked OSM activity research)",
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

function evidence(element, fields) {
  const url = osmUrl(element);
  return Object.entries(fields)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([field, value]) => ({ field, value: String(value), source_url: url }));
}

function mirror(record, sourceMetadata) {
  record.json = { ...record, source_metadata: sourceMetadata };
  return record;
}

function validTags(tags) {
  return [...new Set(tags)].filter((tag) => allowedTags.has(tag)).sort();
}

function hikeRecord(element) {
  const tags = element.tags || {};
  const name = tags.name || tags["name:en"] || tags.ref;
  if (!name) return null;
  const { lat, lon } = getCenter(element);
  if (lat === null || lon === null) return null;
  const sourceUrl = osmUrl(element);
  const osmKind = tags.route === "hiking" ? "hiking route" : `${tags.highway || "trail"} way`;
  const surface = tags.surface ? ` Surface: ${tags.surface}.` : "";
  const operator = tags.operator ? ` Operator: ${tags.operator}.` : "";
  const city = tags["addr:city"] || tags["is_in:city"] || tags["gnis:county_name"] || "Bay Area";
  const wheelchair = tags.wheelchair === "yes" ? true : tags.wheelchair === "no" ? false : null;
  const stroller = wheelchair === true || ["paved", "asphalt", "concrete"].includes(tags.surface) ? true : null;
  const tagsList = validTags([
    "free",
    "outdoor",
    "nature",
    "all-ages",
    tags.sac_scale && !String(tags.sac_scale).includes("hiking") ? "climbing" : null,
    wheelchair === true ? "wheelchair-accessible" : null,
    stroller === true ? "stroller-friendly" : null,
  ].filter(Boolean));
  const record = {
    id: `osm-bay-hike-${element.type}-${element.id}`,
    name,
    description: `OpenStreetMap lists ${name} as a Bay Area ${osmKind}.${surface}${operator}`.trim(),
    primary_category: "Nature",
    subtype: tags.route === "hiking" ? "Hiking Route" : "Trail",
    activity_type: ["outdoor", "nature"],
    age_buckets: ["6-8", "9-12", "13+"],
    age_min: 5,
    age_max: 17,
    involvement: "active_together",
    min_price: 0,
    max_price: 0,
    booking_required: false,
    location_address: addressFromTags(tags, city, "CA, US") || `${name}, ${city}, CA, US`,
    city,
    location_lat: lat,
    location_lon: lon,
    location_environment: "outdoor",
    duration_minutes: 45,
    duration_max_minutes: 180,
    rain_suitable: false,
    tags: tagsList,
    season: ["year-round"],
    highlights: [
      `Follow the source-linked ${osmKind}`,
      tags.network ? `OSM network: ${tags.network}` : "Use the source map before going",
      tags.operator ? `Listed operator: ${tags.operator}` : "Check route conditions before visiting",
    ],
    excitement_score: tags.route === "hiking" ? 4 : 3,
    sensory_friendly: null,
    transit_accessible: null,
    fenced: null,
    accessibility_wheelchair: wheelchair,
    accessibility_stroller: stroller,
    facilities_restrooms: null,
    facilities_changingtable: null,
    imageurlthumb: null,
    image_urls: [],
    urlmoreinfo: sourceUrl,
    source_url: sourceUrl,
    source_confidence: tags.operator || tags.website ? 4 : 3,
    family_fit_score: tags.sac_scale && !["hiking", "mountain_hiking"].includes(tags.sac_scale) ? 3 : 4,
    country_code: "US",
    schema_version: "v3.2-scrape",
    source: "openstreetmap_bay_area_hikes",
    scraped_at: CHECKED_AT,
    event_start: null,
    event_end: null,
    event_starttime: null,
    event_endtime: null,
    ticket_url: null,
    organizer: null,
    foodvenue_kidamenities: null,
    foodvenue_kidcorner: null,
    foodvenue_kidmenu: null,
    trail_lengthkm: null,
    trail_durationminutes: 45,
    trail_routetype: "out-and-back-or-segment",
    json: {},
  };
  return mirror(record, {
    source_name: "openstreetmap_bay_area_hikes",
    source_type: "openstreetmap_overpass",
    source_page_url: sourceUrl,
    source_checked_at: CHECKED_AT,
    external_id: `${element.type}/${element.id}`,
    source_evidence: evidence(element, {
      name,
      osm_type: element.type,
      osm_id: element.id,
      route: tags.route,
      highway: tags.highway,
      surface: tags.surface,
      operator: tags.operator,
      website: tags.website,
      latitude: lat,
      longitude: lon,
    }),
    raw_tags: tags,
    confidence: {
      name: 1,
      category: tags.route === "hiking" || tags.highway ? 0.95 : 0.7,
      coordinates: 0.9,
      address: tags["addr:street"] || tags["addr:city"] ? 0.7 : 0.3,
      amenities: 0.1,
    },
  });
}

function latviaCategory(tags) {
  if (tags.leisure === "playground") return { primary_category: "Fun", subtype: "Playground", activity_type: ["outdoor", "play"], location_environment: "outdoor", rain_suitable: false, age_min: 1, age_max: 10, age_buckets: ["0-2", "3-5", "6-8", "9-12"], tags: ["free", "outdoor", "toddler", "preschool", "elementary"] };
  if (tags.tourism === "museum") return { primary_category: "Culture", subtype: "Museum", activity_type: ["indoor", "culture", "educational"], location_environment: "indoor", rain_suitable: true, age_min: 3, age_max: 17, age_buckets: ["3-5", "6-8", "9-12", "13+"], tags: ["rainy-day", "indoor"] };
  if (tags.amenity === "library") return { primary_category: "Education", subtype: "Library", activity_type: ["indoor", "educational"], location_environment: "indoor", rain_suitable: true, age_min: 0, age_max: 17, age_buckets: ["0-2", "3-5", "6-8", "9-12", "13+"], tags: ["free", "rainy-day", "indoor", "reading", "all-ages"] };
  if (tags.leisure === "park" || tags.leisure === "nature_reserve") return { primary_category: "Nature", subtype: tags.leisure === "nature_reserve" ? "Nature Reserve" : "Park", activity_type: ["outdoor", "nature"], location_environment: "outdoor", rain_suitable: false, age_min: 2, age_max: 17, age_buckets: ["3-5", "6-8", "9-12", "13+"], tags: ["free", "outdoor", "nature", "all-ages"] };
  if (tags.leisure === "swimming_pool") return { primary_category: "Fun", subtype: "Swimming Pool", activity_type: ["indoor", "sports", "water"], location_environment: "both", rain_suitable: true, age_min: 3, age_max: 17, age_buckets: ["3-5", "6-8", "9-12", "13+"], tags: ["water", "sports", "all-ages"] };
  if (tags.leisure === "sports_centre") return { primary_category: "Fun", subtype: "Sports Centre", activity_type: ["indoor", "sports"], location_environment: "indoor", rain_suitable: true, age_min: 5, age_max: 17, age_buckets: ["6-8", "9-12", "13+"], tags: ["sports", "rainy-day", "indoor"] };
  if (["arts_centre", "theatre", "cinema"].includes(tags.amenity)) return { primary_category: "Culture", subtype: tags.amenity.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), activity_type: ["indoor", "culture"], location_environment: "indoor", rain_suitable: true, age_min: 4, age_max: 17, age_buckets: ["3-5", "6-8", "9-12", "13+"], tags: [tags.amenity === "theatre" ? "theatre" : "art", "rainy-day", "indoor"] };
  if (tags.tourism === "zoo") return { primary_category: "Nature", subtype: "Zoo", activity_type: ["outdoor", "animals"], location_environment: "outdoor", rain_suitable: false, age_min: 1, age_max: 17, age_buckets: ["0-2", "3-5", "6-8", "9-12", "13+"], tags: ["animals", "outdoor", "all-ages"] };
  if (tags.tourism === "theme_park") return { primary_category: "Fun", subtype: "Theme Park", activity_type: ["outdoor", "entertainment"], location_environment: "outdoor", rain_suitable: false, age_min: 3, age_max: 17, age_buckets: ["3-5", "6-8", "9-12", "13+"], tags: ["outdoor", "all-ages"] };
  if (tags.tourism === "picnic_site") return { primary_category: "Nature", subtype: "Picnic Site", activity_type: ["outdoor", "nature"], location_environment: "outdoor", rain_suitable: false, age_min: 1, age_max: 17, age_buckets: ["0-2", "3-5", "6-8", "9-12", "13+"], tags: ["free", "outdoor", "picnic-friendly", "nature", "all-ages"] };
  return { primary_category: "Culture", subtype: "Attraction", activity_type: ["outdoor", "culture"], location_environment: "outdoor", rain_suitable: false, age_min: 3, age_max: 17, age_buckets: ["3-5", "6-8", "9-12", "13+"], tags: ["outdoor", "all-ages"] };
}

function latviaRecord(element) {
  const tags = element.tags || {};
  const fallback = tags.leisure === "playground"
    ? `Playground (OSM ${element.type} ${element.id})`
    : tags.leisure === "park"
      ? `Park (OSM ${element.type} ${element.id})`
      : `Latvia activity (OSM ${element.type} ${element.id})`;
  const name = tags.name || tags["name:lv"] || tags["name:en"] || fallback;
  const { lat, lon } = getCenter(element);
  if (lat === null || lon === null) return null;
  const sourceUrl = osmUrl(element);
  const classification = latviaCategory(tags);
  const city = tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || tags["addr:municipality"] || tags["addr:district"] || "Latvia";
  const wheelchair = tags.wheelchair === "yes" ? true : tags.wheelchair === "no" ? false : null;
  const stroller = wheelchair === true || classification.location_environment !== "outdoor" ? true : null;
  const feeKnownFree = tags.fee === "no" || classification.tags.includes("free");
  const record = {
    id: `osm-latvia-${element.type}-${element.id}`,
    name,
    description: `OpenStreetMap lists ${name} in Latvia as ${classification.subtype.toLowerCase()}.`,
    primary_category: classification.primary_category,
    subtype: classification.subtype,
    activity_type: classification.activity_type,
    age_buckets: classification.age_buckets,
    age_min: classification.age_min,
    age_max: classification.age_max,
    involvement: "active_together",
    min_price: feeKnownFree ? 0 : null,
    max_price: feeKnownFree ? 0 : null,
    booking_required: false,
    location_address: addressFromTags(tags, city, "Latvia") || `${name}, ${city}, Latvia`,
    city,
    location_lat: lat,
    location_lon: lon,
    location_environment: classification.location_environment,
    duration_minutes: classification.location_environment === "outdoor" ? 45 : 60,
    duration_max_minutes: classification.location_environment === "outdoor" ? 120 : 180,
    rain_suitable: classification.rain_suitable,
    tags: validTags([
      ...classification.tags,
      tags.wheelchair === "yes" ? "wheelchair-accessible" : null,
      stroller === true ? "stroller-friendly" : null,
      tags.covered === "yes" ? "rainy-day" : null,
      tags.shade === "yes" ? "shade" : null,
      tags.fenced === "yes" ? "fenced" : null,
    ].filter(Boolean)),
    season: ["year-round"],
    highlights: [
      `Source-linked ${classification.subtype.toLowerCase()} in Latvia`,
      tags.website ? "Official website is listed in OSM" : "Use the OSM source page for map context",
      tags.opening_hours ? `Opening hours in OSM: ${tags.opening_hours}` : "Check hours before visiting",
    ],
    excitement_score: ["Playground", "Zoo", "Theme Park", "Swimming Pool"].includes(classification.subtype) ? 4 : 3,
    sensory_friendly: null,
    transit_accessible: null,
    fenced: tags.fenced === "yes" ? true : tags.fenced === "no" ? false : null,
    accessibility_wheelchair: wheelchair,
    accessibility_stroller: stroller,
    facilities_restrooms: tags.toilets === "yes" ? true : null,
    facilities_changingtable: tags.changing_table === "yes" ? true : null,
    imageurlthumb: tags.image || null,
    image_urls: tags.image ? [tags.image] : [],
    urlmoreinfo: tags.website || sourceUrl,
    source_url: sourceUrl,
    source_confidence: tags.website ? 4 : 3,
    family_fit_score: classification.primary_category === "Fun" || classification.subtype === "Library" ? 4 : 3,
    country_code: "LV",
    schema_version: "v3.2-scrape",
    source: "openstreetmap_latvia_activities",
    scraped_at: CHECKED_AT,
    event_start: null,
    event_end: null,
    event_starttime: null,
    event_endtime: null,
    ticket_url: null,
    organizer: null,
    foodvenue_kidamenities: null,
    foodvenue_kidcorner: null,
    foodvenue_kidmenu: null,
    trail_lengthkm: null,
    trail_durationminutes: classification.subtype === "Park" || classification.subtype === "Nature Reserve" ? 45 : null,
    trail_routetype: classification.subtype === "Park" || classification.subtype === "Nature Reserve" ? "open-area-walk" : null,
    json: {},
  };
  return mirror(record, {
    source_name: "openstreetmap_latvia_activities",
    source_type: "openstreetmap_overpass",
    source_page_url: sourceUrl,
    source_checked_at: CHECKED_AT,
    external_id: `${element.type}/${element.id}`,
    source_evidence: evidence(element, {
      name,
      osm_type: element.type,
      osm_id: element.id,
      leisure: tags.leisure,
      tourism: tags.tourism,
      amenity: tags.amenity,
      website: tags.website,
      opening_hours: tags.opening_hours,
      latitude: lat,
      longitude: lon,
    }),
    raw_tags: tags,
    confidence: {
      name: 1,
      category: tags.leisure || tags.tourism || tags.amenity ? 0.95 : 0.6,
      coordinates: 0.9,
      address: tags["addr:street"] || tags["addr:city"] ? 0.7 : 0.3,
      amenities: tags.toilets || tags.wheelchair || tags.fenced ? 0.5 : 0.15,
    },
  });
}

function dedupe(records) {
  const out = [];
  const seen = new Set();
  for (const record of records) {
    if (!record || seen.has(record.id)) continue;
    seen.add(record.id);
    out.push(record);
  }
  return out;
}

function roundRobinBy(records, keyFn, limit) {
  const groups = new Map();
  for (const record of records) {
    const key = keyFn(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const keys = [...groups.keys()].sort();
  const selected = [];
  let cursor = 0;
  while (selected.length < limit && keys.length) {
    const key = keys[cursor % keys.length];
    const group = groups.get(key) || [];
    if (group.length) selected.push(group.shift());
    if (!group.length) {
      keys.splice(keys.indexOf(key), 1);
      cursor = Math.max(0, cursor - 1);
    }
    cursor += 1;
  }
  return selected;
}

async function scrapeBayHikes() {
  console.log("Fetching Bay Area OSM hiking routes/trails");
  const query = `[out:json][timeout:180];
(
  relation[route=hiking][name](37.0,-123.2,38.5,-121.4);
  way[highway~"^(path|footway|track|bridleway)$"][name~"Trail|trail|Loop|loop|Fire Road|Ridge|Creek|Canyon|Peak|Summit|Falls|Lake|Meadow|Point",i](37.0,-123.2,38.5,-121.4);
);
out center tags 1800;`;
  const data = await fetchOverpass(query);
  console.log(`Fetched ${data.elements.length} Bay Area OSM hiking elements`);
  const candidates = data.elements.filter((element) => element.tags?.name);
  const records = dedupe(candidates.map(hikeRecord)).slice(0, BAY_HIKES_TARGET);
  const rejected = candidates
    .filter((element) => !records.some((record) => record.id === `osm-bay-hike-${element.type}-${element.id}`))
    .map((element) => ({ source_url: osmUrl(element), osm_type: element.type, osm_id: element.id, name: element.tags?.name || null, rejected_reason: "outside_final_cap_or_missing_required_fields" }));
  return { candidates, records, rejected, data };
}

async function scrapeLatviaActivities() {
  const filters = [
    'nwr["leisure"="playground"]["name"]',
    'nwr["tourism"="museum"]["name"]',
    'nwr["tourism"="attraction"]["name"]',
    'nwr["leisure"="park"]["name"]',
    'nwr["amenity"="library"]["name"]',
  ];
  const chunks = [];
  const osmCopyrights = [];
  for (const filter of filters) {
    const query = `[out:json][timeout:120];area["ISO3166-1"="LV"]->.lv;${filter}(area.lv);out center tags 800;`;
    console.log(`Fetching Latvia OSM filter: ${filter}`);
    const data = await fetchOverpass(query);
    console.log(`Fetched ${data.elements.length} Latvia OSM elements for ${filter}`);
    chunks.push(...data.elements);
    if (data.osm3s?.copyright) osmCopyrights.push(data.osm3s.copyright);
  }
  const candidates = [];
  const seenElements = new Set();
  for (const element of chunks) {
    const key = `${element.type}/${element.id}`;
    if (seenElements.has(key)) continue;
    seenElements.add(key);
    candidates.push(element);
  }
  const records = roundRobinBy(dedupe(candidates.map(latviaRecord)), (record) => record.subtype, LATVIA_TARGET);
  const rejected = candidates
    .filter((element) => !records.some((record) => record.id === `osm-latvia-${element.type}-${element.id}`))
    .map((element) => ({ source_url: osmUrl(element), osm_type: element.type, osm_id: element.id, name: element.tags?.name || null, rejected_reason: "outside_final_cap_or_missing_required_fields" }));
  return { candidates, records, rejected, data: { osm3s: { copyright: osmCopyrights[0] } } };
}

function sourceSummary(kind, result, savedRecords) {
  return {
    generated_at: CHECKED_AT,
    source: kind,
    source_type: "openstreetmap_overpass",
    osm_license: result.data.osm3s?.copyright || "OpenStreetMap data available under ODbL",
    saved_records: savedRecords.length,
    candidate_records: result.candidates.length,
    rejected_records: result.rejected.length,
    saved_by_source: savedRecords.reduce((acc, record) => {
      acc[record.source] = (acc[record.source] || 0) + 1;
      return acc;
    }, {}),
  };
}

async function writeJson(fileName, data) {
  await fs.writeFile(path.join(OUT_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const bay = await scrapeBayHikes();
  const latvia = await scrapeLatviaActivities();
  if (bay.records.length < 200) throw new Error(`Bay Area hikes too low: ${bay.records.length}`);
  if (latvia.records.length < 300) throw new Error(`Latvia activities too low: ${latvia.records.length}`);

  await writeJson("bay_area_hikes_candidates_20260425.json", bay.candidates);
  await writeJson("bay_area_hikes_activityspots_scrape_20260425.json", bay.records);
  await writeJson("bay_area_hikes_rejected_20260425.json", bay.rejected);
  await writeJson("bay_area_hikes_sources_20260425.json", sourceSummary("bay_area_hikes", bay, bay.records));

  await writeJson("latvia_activity_candidates_20260425.json", latvia.candidates);
  await writeJson("latvia_activityspots_scrape_20260425.json", latvia.records);
  await writeJson("latvia_activity_rejected_20260425.json", latvia.rejected);
  await writeJson("latvia_activity_sources_20260425.json", sourceSummary("latvia_activities", latvia, latvia.records));

  console.log(JSON.stringify({
    generated_at: CHECKED_AT,
    bay_area_hikes: sourceSummary("bay_area_hikes", bay, bay.records),
    latvia_activities: sourceSummary("latvia_activities", latvia, latvia.records),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
