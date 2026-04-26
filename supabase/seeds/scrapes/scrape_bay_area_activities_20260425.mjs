import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = "/Users/kasparszemitis/pycharm/gokiddo/famactify/supabase/seeds/scrapes";
const CHECKED_AT = "2026-04-25T23:59:00-07:00";
const MAX_RECORDS = 1000;
const MIN_RECORDS = 500;

const allowedTags = new Set([
  "editors-pick", "rainy-day", "free", "under-$10", "under-$20", "weekend-special", "summer-pick",
  "stroller-friendly", "wheelchair-accessible", "parking-easy", "close-to-bart", "food-nearby", "booking-needed-advance",
  "animals", "science", "art", "music", "cooking", "water", "climbing", "nature", "sports", "theatre", "reading", "building", "trains", "dinosaurs", "space",
  "toddler", "preschool", "elementary", "teen", "all-ages",
  "indoor", "outdoor", "both-indoor-outdoor", "beach", "forest", "urban", "farm",
  "sensory-friendly", "transit-friendly", "nursing-friendly", "food-available", "picnic-friendly", "shade", "fenced", "sibling-friendly", "carrier-friendly", "low-cost", "memberships-accepted", "drop-in", "reservation-required",
]);

const sourceStats = {};
const candidates = [];
const normalized = [];
const rejected = [];

const libraryLocationOverrides = {
  Oakland: {
    "Main Library": "125 14th Street, Oakland, CA 94612",
    "Main Library Childrens Room": "125 14th Street, Oakland, CA 94612",
    "Main Library TeenZone": "125 14th Street, Oakland, CA 94612",
    "81st Avenue Branch": "1021 81st Avenue, Oakland, CA 94621",
    "Asian Branch": "388 9th Street, Suite 190, Oakland, CA 94607",
    "César E. Chávez Branch": "3301 East 12th Street, Oakland, CA 94601",
    "Dimond Branch": "3565 Fruitvale Avenue, Oakland, CA 94602",
    "Eastmont Branch": "7200 Bancroft Avenue, Suite 211, Oakland, CA 94605",
    "Elmhurst Branch": "1427 88th Avenue, Oakland, CA 94621",
    "Golden Gate Branch": "5606 San Pablo Avenue, Oakland, CA 94608",
    "Lakeview Branch": "550 El Embarcadero, Oakland, CA 94610",
    "Martin Luther King Jr. Branch": "6833 International Boulevard, Oakland, CA 94621",
    "Melrose Branch": "4805 Foothill Boulevard, Oakland, CA 94601",
    "Montclair Branch": "1687 Mountain Boulevard, Oakland, CA 94611",
    "Piedmont Avenue Branch": "160 41st Street, Oakland, CA 94611",
    "Rockridge Branch": "5366 College Avenue, Oakland, CA 94618",
    "Temescal Branch": "5205 Telegraph Avenue, Oakland, CA 94609",
    "West Oakland Branch": "1801 Adeline Street, Oakland, CA 94607",
  },
  Berkeley: {
    "Central Library": "2090 Kittredge Street, Berkeley, CA 94704",
    "Claremont Branch": "2940 Benvenue Avenue, Berkeley, CA 94705",
    "North Branch": "1170 The Alameda, Berkeley, CA 94707",
    "Tarea Hall Pittman South Branch": "1901 Russell Street, Berkeley, CA 94703",
    "South Branch": "1901 Russell Street, Berkeley, CA 94703",
    "West Branch": "1125 University Avenue, Berkeley, CA 94702",
    "Tool Lending Library": "1901 Russell Street, Berkeley, CA 94703",
  },
  "San Jose": {
    "Dr. Martin Luther King, Jr. Library": "150 East San Fernando Street, San Jose, CA 95112",
    "King Library": "150 East San Fernando Street, San Jose, CA 95112",
  },
};

function addStat(source, key, amount = 1) {
  sourceStats[source] ??= { fetched_pages: 0, candidates: 0, accepted: 0, rejected: 0, errors: [] };
  sourceStats[source][key] = (sourceStats[source][key] || 0) + amount;
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x3D;/g, "=")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value = "") {
  return decodeHtml(String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      "user-agent": "FamActifyDataBot/0.1 (+https://famactify.app; source-linked public event data research)",
      "accept": "text/html,application/json;q=0.9,*/*;q=0.8",
    },
  }).finally(() => clearTimeout(timeout));
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

function stableSlug(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function inferFromText(title, description, audienceNames = [], typeNames = []) {
  const text = `${title} ${description} ${audienceNames.join(" ")} ${typeNames.join(" ")}`.toLowerCase();
  const tags = new Set(["free"]);
  let primary_category = "Education";
  let subtype = "Library Event";
  let activity_type = ["indoor", "educational"];
  let location_environment = "indoor";
  let rain_suitable = true;
  let excitement_score = 3;
  let family_fit_score = 3;
  let age_min = 0;
  let age_max = 17;
  let age_buckets = ["0-2", "3-5", "6-8", "9-12", "13+"];

  const has = (...words) => words.some((word) => text.includes(word));

  if (has("baby", "babies", "birth to 5", "toddler", "toddlers", "preschool", "early childhood", "0-5")) {
    tags.add("toddler");
    tags.add("preschool");
    age_min = 0;
    age_max = 5;
    age_buckets = ["0-2", "3-5"];
    family_fit_score = 5;
  }
  if (has("family", "families", "all ages")) {
    tags.add("all-ages");
    age_min = 0;
    age_max = 17;
    age_buckets = ["0-2", "3-5", "6-8", "9-12", "13+"];
    family_fit_score = Math.max(family_fit_score, 4);
  }
  if (has("kids", "children", "grade school", "elementary", "ages 5-10")) {
    tags.add("elementary");
    age_min = Math.min(age_min, 5);
    age_max = Math.max(age_max, 10);
    age_buckets = Array.from(new Set([...age_buckets, "6-8", "9-12"]));
    family_fit_score = Math.max(family_fit_score, 4);
  }
  if (has("teen", "teens", "pre-teen", "pre-teens", "tween", "tweens", "middle school")) {
    tags.add("teen");
    age_min = Math.max(age_min, 10);
    age_max = 18;
    age_buckets = ["9-12", "13+"];
    family_fit_score = Math.max(family_fit_score, 4);
  }
  if (has("storytime", "story time", "songs", "puppets", "read aloud")) {
    primary_category = "Education";
    subtype = "Storytime";
    tags.add("reading");
    tags.add("toddler");
    tags.add("preschool");
    excitement_score = 4;
    family_fit_score = 5;
  }
  if (has("craft", "crafts", "art", "paint", "draw", "maker", "making", "diy", "create")) {
    primary_category = "Culture";
    subtype = "Art Workshop";
    activity_type = ["indoor", "arts", "educational"];
    tags.add("art");
    tags.add("building");
    excitement_score = 4;
  }
  if (has("lego", "build", "building", "maker", "robot", "coding", "stem", "science", "engineering", "math", "experiment")) {
    primary_category = "Education";
    subtype = "STEM Workshop";
    activity_type = ["indoor", "educational", "science"];
    tags.add("science");
    tags.add("building");
    excitement_score = 4;
  }
  if (has("chess", "board game", "games", "gaming", "minecraft", "switch")) {
    primary_category = "Social";
    subtype = "Game Club";
    activity_type = ["indoor", "entertainment", "educational"];
    tags.add("building");
    excitement_score = 4;
  }
  if (has("music", "dance", "concert", "performance", "theater", "theatre", "puppet")) {
    primary_category = "Culture";
    subtype = "Performance";
    activity_type = ["indoor", "entertainment", "arts"];
    tags.add("music");
    tags.add("theatre");
    excitement_score = 4;
  }
  if (has("garden", "outdoor", "nature", "park", "walk", "plants", "farm", "animals")) {
    primary_category = "Nature";
    subtype = "Nature Program";
    activity_type = ["outdoor", "nature", "educational"];
    location_environment = has("indoor") ? "both" : "outdoor";
    rain_suitable = false;
    tags.add("nature");
    tags.add("outdoor");
    if (has("animals")) tags.add("animals");
    if (has("farm")) tags.add("farm");
  }
  if (has("movie", "film")) {
    primary_category = "Fun";
    subtype = "Movie";
    activity_type = ["indoor", "entertainment"];
    excitement_score = 3;
  }
  if (has("homework", "tutor", "test prep", "sat", "college", "jobs")) {
    primary_category = "Education";
    subtype = "Academic Support";
    activity_type = ["indoor", "educational"];
    excitement_score = 2;
  }
  if (has("sensory")) tags.add("sensory-friendly");
  if (has("snack", "food", "lunch")) tags.add("food-available");
  if (has("registration required", "register", "reservation required")) tags.add("reservation-required");
  if (location_environment === "indoor") {
    tags.add("indoor");
    tags.add("rainy-day");
  } else if (location_environment === "both") {
    tags.add("both-indoor-outdoor");
  }

  return {
    primary_category,
    subtype,
    activity_type,
    location_environment,
    rain_suitable,
    tags: [...tags].filter((tag) => allowedTags.has(tag)).sort(),
    age_min,
    age_max,
    age_buckets: [...new Set(age_buckets)].sort((a, b) => ["0-2", "3-5", "6-8", "9-12", "13+"].indexOf(a) - ["0-2", "3-5", "6-8", "9-12", "13+"].indexOf(b)),
    excitement_score,
    family_fit_score,
  };
}

function durationMinutes(start, end) {
  if (!start || !end) return { duration_minutes: 60, duration_max_minutes: 90 };
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  if (!Number.isFinite(diff) || diff <= 0) return { duration_minutes: 60, duration_max_minutes: 90 };
  return { duration_minutes: Math.min(diff, 240), duration_max_minutes: Math.min(Math.max(diff, 60), 300) };
}

function buildRecord(candidate) {
  const inferred = inferFromText(candidate.name, candidate.description, candidate.audience_names, candidate.type_names);
  if (inferred.family_fit_score < 3) {
    return reject(candidate, "family_fit_score_below_threshold");
  }
  const { duration_minutes, duration_max_minutes } = durationMinutes(candidate.event_start, candidate.event_end);
  const locationName = candidate.location_name || "Public event location";
  const city = candidate.city || "Bay Area";
  const address = candidate.location_address || `${locationName}, ${city}, CA`;
  const bookingRequired = /registration required|register|reservation required/i.test(`${candidate.description} ${candidate.registration_text || ""}`);
  const sourceConfidence = candidate.source_type === "official_calendar_api" ? 5 : 4;
  const highlights = [
    `Join ${locationName}`,
    inferred.subtype === "Storytime" ? "Hear stories, songs, and rhymes" : `Try a ${inferred.subtype.toLowerCase()} activity`,
    candidate.event_start ? `Go on ${candidate.event_start.slice(0, 10)}` : "Check the source for schedule details",
  ];
  const id = `scrape-${stableSlug(candidate.source_name)}-${stableSlug(candidate.external_id || candidate.source_url)}`.slice(0, 120);
  const record = {
    id,
    name: candidate.name,
    description: candidate.description.slice(0, 700),
    primary_category: inferred.primary_category,
    subtype: inferred.subtype,
    activity_type: inferred.activity_type,
    age_buckets: inferred.age_buckets,
    age_min: inferred.age_min,
    age_max: inferred.age_max,
    involvement: bookingRequired && /teen|teens|sat|volunteer|homework/i.test(candidate.name) ? "drop_go" : "active_together",
    min_price: 0,
    max_price: 0,
    booking_required: bookingRequired,
    location_address: address,
    city,
    location_lat: candidate.location_lat ?? null,
    location_lon: candidate.location_lon ?? null,
    location_environment: inferred.location_environment,
    duration_minutes,
    duration_max_minutes,
    rain_suitable: inferred.rain_suitable,
    tags: bookingRequired ? [...new Set([...inferred.tags, "booking-needed-advance"])] : inferred.tags,
    season: ["year-round"],
    highlights,
    excitement_score: inferred.excitement_score,
    sensory_friendly: inferred.tags.includes("sensory-friendly") ? true : null,
    transit_accessible: candidate.transit_accessible ?? null,
    fenced: null,
    accessibility_wheelchair: candidate.accessibility_wheelchair ?? null,
    accessibility_stroller: candidate.accessibility_stroller ?? null,
    facilities_restrooms: candidate.facilities_restrooms ?? null,
    facilities_changingtable: candidate.facilities_changingtable ?? null,
    imageurlthumb: candidate.image_url || null,
    image_urls: candidate.image_url ? [candidate.image_url] : [],
    urlmoreinfo: candidate.source_url,
    source_url: candidate.source_url,
    source_confidence: sourceConfidence,
    family_fit_score: inferred.family_fit_score,
    country_code: "US",
    schema_version: "v3.2-scrape",
    source: candidate.source_name,
    scraped_at: CHECKED_AT,
    event_start: candidate.event_start || null,
    event_end: candidate.event_end || null,
    event_starttime: candidate.event_start || null,
    event_endtime: candidate.event_end || null,
    ticket_url: candidate.event_start ? candidate.source_url : null,
    organizer: candidate.source_name,
    foodvenue_kidamenities: null,
    foodvenue_kidcorner: null,
    foodvenue_kidmenu: null,
    trail_lengthkm: null,
    trail_durationminutes: null,
    trail_routetype: null,
    json: {},
  };
  record.json = {
    ...record,
    source_metadata: {
      source_name: candidate.source_name,
      source_type: candidate.source_type,
      source_page_url: candidate.source_page_url,
      source_checked_at: CHECKED_AT,
      external_id: candidate.external_id,
      source_evidence: candidate.source_evidence,
      audience_names: candidate.audience_names,
      type_names: candidate.type_names,
      program_name: candidate.program_name || null,
      raw_location_name: candidate.location_name || null,
      confidence: {
        name: 1,
        date_time: candidate.event_start ? 1 : 0.6,
        source_url: 1,
        address: candidate.location_address ? 0.9 : 0.4,
        age: candidate.audience_names?.length ? 0.9 : 0.5,
        amenities: 0.2,
      },
    },
  };
  normalized.push(record);
  addStat(candidate.source_name, "accepted");
  return record;
}

function reject(candidate, reason) {
  rejected.push({ ...candidate, rejected_reason: reason });
  addStat(candidate.source_name || "unknown", "rejected");
  return null;
}

function pushCandidate(candidate) {
  candidates.push(candidate);
  addStat(candidate.source_name, "candidates");
}

function extractIsoJson(html) {
  const match = html.match(/<script type="application\/json" data-iso-key="_0">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return JSON.parse(decodeHtml(match[1]));
  }
}

function getBiblioLocation(city, location) {
  if (!location) return {};
  const point = location.mapLocation?.centrePoint || {};
  const addressParts = [
    location.address?.streetAddress || location.address1 || location.streetAddress,
    location.address?.locality || location.city,
    location.address?.region || "CA",
    location.address?.postalCode || location.zip,
  ].filter(Boolean);
  const override = libraryLocationOverrides[city]?.[location.name];
  return {
    location_name: location.name,
    location_address: override || (addressParts.length ? addressParts.join(", ") : null),
    location_lat: point.lat ?? null,
    location_lon: point.lng ?? null,
  };
}

async function scrapeBiblio({ sourceName, city, baseUrl, maxPages }) {
  const seen = new Set();
  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = `${baseUrl}/v2/events?page=${page}`;
    try {
      const html = await fetchText(pageUrl);
      addStat(sourceName, "fetched_pages");
      const state = extractIsoJson(html);
      if (!state) {
        sourceStats[sourceName].errors.push({ pageUrl, error: "missing_iso_json" });
        continue;
      }
      const events = Object.values(state.entities.events || {});
      const audiences = state.entities.eventAudiences || {};
      const types = state.entities.eventTypes || {};
      const programs = state.entities.eventPrograms || {};
      const images = state.entities.images || {};
      const locations = state.entities.locations || {};
      for (const event of events) {
        const definition = event.definition || {};
        const audienceNames = (definition.audienceIds || []).map((id) => audiences[id]?.name).filter(Boolean);
        const typeNames = (definition.typeIds || []).map((id) => types[id]?.name).filter(Boolean);
        const familyText = `${audienceNames.join(" ")} ${typeNames.join(" ")} ${definition.title || ""}`.toLowerCase();
        if (!/(kid|kids|birth|baby|babies|toddler|preschool|grade school|children|young children|family|families|teen|teens|pre-teen|pre-teens|tween|tweens|ages 0-5|ages 5-10|ages 10-12|ages 12-18)/.test(familyText)) {
          reject({
            source_name: sourceName,
            source_type: "official_calendar_api",
            external_id: event.id,
            name: definition.title || "Untitled event",
            source_url: `${baseUrl}/v2/events/${event.id}`,
            source_page_url: pageUrl,
          }, "no_family_audience_signal");
          continue;
        }
        if (seen.has(event.id)) continue;
        seen.add(event.id);
        const location = definition.branchLocationId ? locations[definition.branchLocationId] : locations[definition.nonBranchLocationId];
        const locationInfo = getBiblioLocation(city, location);
        const image = definition.featuredImageId ? images[definition.featuredImageId] : null;
        const candidate = {
          source_name: sourceName,
          source_type: "official_calendar_api",
          external_id: event.id,
          name: stripHtml(definition.title || "Untitled event"),
          description: stripHtml(definition.description || definition.title || "Library event."),
          city,
          ...locationInfo,
          source_url: `${baseUrl}/v2/events/${event.id}`,
          source_page_url: pageUrl,
          event_start: event.indexStart || definition.start || null,
          event_end: event.indexEnd || definition.end || null,
          audience_names: audienceNames,
          type_names: typeNames,
          program_name: definition.programId ? programs[definition.programId]?.name : null,
          image_url: image?.url || null,
          registration_text: JSON.stringify(definition.registrationInfo || {}),
          transit_accessible: city === "San Jose" || city === "Oakland" ? true : null,
          accessibility_wheelchair: true,
          accessibility_stroller: true,
          facilities_restrooms: true,
          facilities_changingtable: null,
          source_evidence: [
            { field: "name", value: stripHtml(definition.title || ""), source_url: `${baseUrl}/v2/events/${event.id}` },
            { field: "date_time", value: `${definition.start || event.indexStart || ""} - ${definition.end || event.indexEnd || ""}`, source_url: `${baseUrl}/v2/events/${event.id}` },
            { field: "audience", value: audienceNames.join(", "), source_url: `${baseUrl}/v2/events/${event.id}` },
            { field: "location", value: locationInfo.location_address || locationInfo.location_name || "", source_url: `${baseUrl}/v2/events/${event.id}` },
          ],
        };
        pushCandidate(candidate);
        buildRecord(candidate);
      }
    } catch (error) {
      sourceStats[sourceName] ??= { fetched_pages: 0, candidates: 0, accepted: 0, rejected: 0, errors: [] };
      sourceStats[sourceName].errors.push({ pageUrl, error: error.message });
    }
  }
}

async function scrapeBerkeley(maxDays = 240) {
  const sourceName = "berkeley_public_library";
  const req = encodeURIComponent(JSON.stringify({
    days: maxDays,
    date: "2026-04-26",
    private: false,
    locations: [],
    excludedLocations: [],
    types: [],
    excludedTypes: [],
    ages: [],
    excludedAges: [],
    search: "",
  }));
  const pageUrl = `https://berkeleypubliclibrary.libnet.info/eeventcaldata?event_type=0&req=${req}`;
  try {
    const data = JSON.parse(await fetchText(pageUrl));
    addStat(sourceName, "fetched_pages");
    for (const event of data) {
      const text = `${event.title || ""} ${event.description || ""} ${event.long_description || ""} ${event.age || ""}`.toLowerCase();
      if (!/(storytime|family|families|children|kids|teen|toddler|preschool|baby|babies|ages|craft|lego|game|chess|summer|youth)/.test(text)) {
        reject({
          source_name: sourceName,
          source_type: "official_calendar_api",
          external_id: event.id,
          name: event.title || "Untitled event",
          source_url: `https://berkeleypubliclibrary.libnet.info/event/${event.id}`,
          source_page_url: pageUrl,
        }, "no_family_activity_keyword");
        continue;
      }
      const locationName = stripHtml(event.location || "Berkeley Public Library");
      const locationAddress = libraryLocationOverrides.Berkeley[locationName] || `${locationName}, Berkeley, CA`;
      const candidate = {
        source_name: sourceName,
        source_type: "official_calendar_api",
        external_id: event.id,
        name: stripHtml(event.title || "Berkeley Public Library event"),
        description: stripHtml(event.long_description || event.description || event.title || "Berkeley Public Library event."),
        city: "Berkeley",
        location_name: locationName,
        location_address: locationAddress,
        location_lat: null,
        location_lon: null,
        source_url: `https://berkeleypubliclibrary.libnet.info/event/${event.id}`,
        source_page_url: pageUrl,
        event_start: event.raw_start_time || event.event_start || null,
        event_end: event.raw_end_time || event.event_end || null,
        audience_names: [stripHtml(event.age || "Families")].filter(Boolean),
        type_names: [stripHtml(event.type || event.category || "")].filter(Boolean),
        program_name: null,
        image_url: event.image ? `https://berkeleypubliclibrary.libnet.info/images/events/berkeleypubliclibrary/${event.image}` : null,
        registration_text: `${event.registration || ""} ${event.registration_open || ""}`,
        transit_accessible: true,
        accessibility_wheelchair: true,
        accessibility_stroller: true,
        facilities_restrooms: true,
        facilities_changingtable: null,
        source_evidence: [
          { field: "name", value: stripHtml(event.title || ""), source_url: `https://berkeleypubliclibrary.libnet.info/event/${event.id}` },
          { field: "date_time", value: `${event.raw_start_time || ""} - ${event.raw_end_time || ""}`, source_url: `https://berkeleypubliclibrary.libnet.info/event/${event.id}` },
          { field: "location", value: locationAddress, source_url: `https://berkeleypubliclibrary.libnet.info/event/${event.id}` },
        ],
      };
      pushCandidate(candidate);
      buildRecord(candidate);
    }
  } catch (error) {
    sourceStats[sourceName] ??= { fetched_pages: 0, candidates: 0, accepted: 0, rejected: 0, errors: [] };
    sourceStats[sourceName].errors.push({ pageUrl, error: error.message });
  }
}

function parseSfplArticles(html, pageUrl) {
  const articles = [...html.matchAll(/<article about="([^"]+)" class="event event--teaser ([^"]*) teaser">([\s\S]*?)<\/article>/g)];
  return articles.map((match) => {
    const relativeUrl = decodeHtml(match[1]);
    const body = match[3];
    const title = stripHtml((body.match(/<h2 class="event__title">[\s\S]*?<span>([\s\S]*?)<\/span>/) || [])[1] || "");
    const dateText = stripHtml((body.match(/<span class="date-display-range">([\s\S]*?)<\/span>/) || [])[1] || "");
    const audienceNames = [...body.matchAll(/field-event-audience[\s\S]*?<a [^>]*>([\s\S]*?)<\/a>/g)].map((m) => stripHtml(m[1]));
    const typeNames = [...body.matchAll(/field-event-topic[\s\S]*?<a [^>]*>([\s\S]*?)<\/a>/g)].map((m) => stripHtml(m[1]));
    const locationName = stripHtml((body.match(/event__location[\s\S]*?<a [^>]*>([\s\S]*?)<\/a>/) || [])[1] || "San Francisco Public Library");
    return {
      source_name: "san_francisco_public_library",
      source_type: "official_calendar_page",
      external_id: relativeUrl.split("/").filter(Boolean).join("-"),
      name: title,
      description: `${title}. SFPL event listed for ${dateText}.`,
      city: "San Francisco",
      location_name: locationName,
      location_address: `${locationName}, San Francisco, CA`,
      location_lat: null,
      location_lon: null,
      source_url: `https://sfpl.org${relativeUrl}`,
      source_page_url: pageUrl,
      event_start: null,
      event_end: null,
      audience_names: audienceNames,
      type_names: typeNames,
      program_name: null,
      image_url: null,
      registration_text: "",
      transit_accessible: true,
      accessibility_wheelchair: true,
      accessibility_stroller: true,
      facilities_restrooms: true,
      facilities_changingtable: null,
      source_evidence: [
        { field: "name", value: title, source_url: `https://sfpl.org${relativeUrl}` },
        { field: "date_time", value: dateText, source_url: `https://sfpl.org${relativeUrl}` },
        { field: "audience", value: audienceNames.join(", "), source_url: `https://sfpl.org${relativeUrl}` },
        { field: "location", value: locationName, source_url: `https://sfpl.org${relativeUrl}` },
      ],
    };
  });
}

async function scrapeSfpl(maxPages = 45) {
  const sourceName = "san_francisco_public_library";
  for (let page = 0; page < maxPages; page++) {
    const pageUrl = `https://sfpl.org/events?page=${page}`;
    try {
      const html = await fetchText(pageUrl);
      addStat(sourceName, "fetched_pages");
      for (const candidate of parseSfplArticles(html, pageUrl)) {
        if (!candidate.name) continue;
        const familyText = `${candidate.name} ${candidate.audience_names.join(" ")} ${candidate.type_names.join(" ")}`.toLowerCase();
        if (!/(early childhood|elementary|family|teen|middle school|all ages|children|kids|storytime|chess|youth)/.test(familyText)) {
          reject(candidate, "no_family_audience_signal");
          continue;
        }
        pushCandidate(candidate);
        buildRecord(candidate);
      }
    } catch (error) {
      sourceStats[sourceName] ??= { fetched_pages: 0, candidates: 0, accepted: 0, rejected: 0, errors: [] };
      sourceStats[sourceName].errors.push({ pageUrl, error: error.message });
    }
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await scrapeBiblio({
    sourceName: "oakland_public_library",
    city: "Oakland",
    baseUrl: "https://oaklandlibrary.bibliocommons.com",
    maxPages: 30,
  });
  await scrapeBiblio({
    sourceName: "san_jose_public_library",
    city: "San Jose",
    baseUrl: "https://sjpl.bibliocommons.com",
    maxPages: 35,
  });
  await scrapeBerkeley(260);
  await scrapeSfpl(55);

  const deduped = [];
  const seenIds = new Set();
  for (const record of normalized) {
    if (seenIds.has(record.id)) continue;
    seenIds.add(record.id);
    deduped.push(record);
  }
  const recordsBySource = new Map();
  for (const record of deduped) {
    if (!recordsBySource.has(record.source)) recordsBySource.set(record.source, []);
    recordsBySource.get(record.source).push(record);
  }
  const sourceNames = [...recordsBySource.keys()].sort();
  const selected = [];
  let cursor = 0;
  while (selected.length < MAX_RECORDS && sourceNames.length) {
    const sourceName = sourceNames[cursor % sourceNames.length];
    const records = recordsBySource.get(sourceName) || [];
    if (records.length) selected.push(records.shift());
    if (!records.length) {
      sourceNames.splice(sourceNames.indexOf(sourceName), 1);
      cursor = Math.max(0, cursor - 1);
    }
    cursor += 1;
  }
  normalized.length = 0;
  normalized.push(...selected);
  for (const stat of Object.values(sourceStats)) {
    stat.saved = 0;
  }
  for (const record of normalized) {
    sourceStats[record.source] ??= { fetched_pages: 0, candidates: 0, accepted: 0, rejected: 0, saved: 0, errors: [] };
    sourceStats[record.source].saved = (sourceStats[record.source].saved || 0) + 1;
  }

  if (normalized.length < MIN_RECORDS) {
    throw new Error(`Only collected ${normalized.length}; minimum is ${MIN_RECORDS}`);
  }

  const sourceSummary = {
    generated_at: CHECKED_AT,
    requested_range: "500-1000",
    saved_records: normalized.length,
    candidate_records: candidates.length,
    rejected_records: rejected.length,
    sources: sourceStats,
    files: {
      candidates: "bay_area_activity_candidates_20260425.json",
      activityspots: "bay_area_activityspots_scrape_20260425.json",
      rejected: "bay_area_activity_rejected_20260425.json",
      sources: "bay_area_activity_sources_20260425.json",
    },
  };

  await fs.writeFile(path.join(OUT_DIR, "bay_area_activity_candidates_20260425.json"), `${JSON.stringify(candidates, null, 2)}\n`);
  await fs.writeFile(path.join(OUT_DIR, "bay_area_activityspots_scrape_20260425.json"), `${JSON.stringify(normalized, null, 2)}\n`);
  await fs.writeFile(path.join(OUT_DIR, "bay_area_activity_rejected_20260425.json"), `${JSON.stringify(rejected, null, 2)}\n`);
  await fs.writeFile(path.join(OUT_DIR, "bay_area_activity_sources_20260425.json"), `${JSON.stringify(sourceSummary, null, 2)}\n`);
  console.log(JSON.stringify(sourceSummary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
