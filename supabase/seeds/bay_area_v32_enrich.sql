-- Bay Area Activity v3.2 Enrichment Patch
-- Run AFTER: supabase/seeds/bay_area_activities_v31.sql
-- Requires migration: 20260425_190000_extend_activityspots_v32_attributes.sql
-- Adds sensory/transit/fenced filters plus provenance scores
-- Generated: 2026-04-25

UPDATE public.activityspots
SET
  sensory_friendly = TRUE,
  transit_accessible = FALSE,
  fenced = TRUE,
  source_url = 'https://www.ebparks.org/parks/venues/little-farm',
  source_confidence = 5,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-001","name":"Tilden Regional Park - Little Farm","description":"Free working farm in the Tilden Nature Area with cows, sheep, goats, rabbits, chickens, and pigs. East Bay Parks lists the Little Farm as open during regular park hours; animal feeding is limited to staff-led programs.","primary_category":"Nature","subtype":"Animal Farm","activity_type":["outdoor","park","animals","nature","farm"],"age_buckets":["0-2","3-5","6-8"],"age_min":1,"age_max":10,"involvement":"active_together","min_price":0,"max_price":0,"booking_required":false,"location_address":"Tilden Nature Area Environmental Education Center, 1500 Central Park Drive, Berkeley, CA 94708","city":"Berkeley","location_lat":37.909,"location_lon":-122.265,"location_environment":"outdoor","duration_minutes":60,"duration_max_minutes":120,"rain_suitable":false,"tags":["free","animals","nature","toddler","preschool","outdoor","farm","editors-pick"],"season":["year-round"],"highlights":["Watch goats climb their pen","Spot pigs and rabbits up close","Walk the boardwalk to Jewel Lake"],"excitement_score":5,"imageurlthumb":"https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://www.ebparks.org/parks/venues/little-farm","country_code":"US","sensory_friendly":true,"transit_accessible":false,"fenced":true,"source_url":"https://www.ebparks.org/parks/venues/little-farm","source_confidence":5,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-001';

UPDATE public.activityspots
SET
  sensory_friendly = FALSE,
  transit_accessible = TRUE,
  fenced = FALSE,
  source_url = 'https://www.exploratorium.edu/visit',
  source_confidence = 5,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-002","name":"Exploratorium","description":"Hands-on science, art, and perception museum at Pier 15 with hundreds of interactive exhibits. Current public visitor listings place it at Pier 15 on the Embarcadero, with daytime hours and paid admission for most visitors.","primary_category":"Education","subtype":"Science Museum","activity_type":["indoor","museum","educational","science"],"age_buckets":["3-5","6-8","9-12","13+"],"age_min":4,"age_max":17,"involvement":"active_together","min_price":0,"max_price":40,"booking_required":false,"location_address":"Pier 15, The Embarcadero, San Francisco, CA 94111","city":"San Francisco","location_lat":37.8014,"location_lon":-122.3973,"location_environment":"indoor","duration_minutes":150,"duration_max_minutes":240,"rain_suitable":true,"tags":["rainy-day","science","indoor","elementary","teen","all-ages","editors-pick"],"season":["year-round"],"highlights":["Step inside a tornado tube","Make shadows dance on the wall","Tinker with real science exhibits"],"excitement_score":5,"imageurlthumb":"https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://www.exploratorium.edu/visit","country_code":"US","sensory_friendly":false,"transit_accessible":true,"fenced":false,"source_url":"https://www.exploratorium.edu/visit","source_confidence":5,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-002';

UPDATE public.activityspots
SET
  sensory_friendly = FALSE,
  transit_accessible = FALSE,
  fenced = TRUE,
  source_url = 'https://www.oaklandzoo.org/admission',
  source_confidence = 5,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-003","name":"Oakland Zoo","description":"Large outdoor zoo in the Oakland hills with animal habitats, a Children''s Zoo, rides, and a gondola included with admission. Oakland Zoo requires advance reservations for general admission ticket buyers and uses plan-ahead pricing.","primary_category":"Nature","subtype":"Zoo","activity_type":["outdoor","animals","nature","entertainment"],"age_buckets":["0-2","3-5","6-8","9-12","13+"],"age_min":1,"age_max":17,"involvement":"active_together","min_price":0,"max_price":35,"booking_required":true,"location_address":"9777 Golf Links Road, Oakland, CA 94605","city":"Oakland","location_lat":37.7503,"location_lon":-122.1468,"location_environment":"outdoor","duration_minutes":180,"duration_max_minutes":300,"rain_suitable":false,"tags":["animals","outdoor","toddler","preschool","elementary","booking-needed-advance","editors-pick"],"season":["year-round"],"highlights":["Ride the gondola over the hills","Visit the Children''s Zoo animals","Watch elephants and giraffes roam"],"excitement_score":4,"imageurlthumb":"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://www.oaklandzoo.org/admission","country_code":"US","sensory_friendly":false,"transit_accessible":false,"fenced":true,"source_url":"https://www.oaklandzoo.org/admission","source_confidence":5,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-003';

UPDATE public.activityspots
SET
  sensory_friendly = FALSE,
  transit_accessible = FALSE,
  fenced = FALSE,
  source_url = 'https://lawrencehallofscience.org/visitors/plan-your-visit/',
  source_confidence = 5,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-004","name":"The Lawrence Hall of Science","description":"UC Berkeley public science center at 1 Centennial Drive with hands-on exhibits, planetarium add-ons, animal discovery, and Bay views. The Lawrence lists admission for adults and children ages 3+ and free entry for children 2 and under.","primary_category":"Education","subtype":"Science Center","activity_type":["indoor","museum","educational","science"],"age_buckets":["3-5","6-8","9-12","13+"],"age_min":3,"age_max":17,"involvement":"active_together","min_price":0,"max_price":25,"booking_required":false,"location_address":"1 Centennial Drive, Berkeley, CA 94720","city":"Berkeley","location_lat":37.8792,"location_lon":-122.2464,"location_environment":"indoor","duration_minutes":120,"duration_max_minutes":180,"rain_suitable":true,"tags":["rainy-day","science","indoor","elementary","teen","all-ages","editors-pick"],"season":["year-round"],"highlights":["Add a planetarium show","Explore the Animal Discovery Zone","Build and test science ideas"],"excitement_score":4,"imageurlthumb":"https://images.unsplash.com/photo-1517976487492-5750f3195933?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://lawrencehallofscience.org/visitors/plan-your-visit/","country_code":"US","sensory_friendly":false,"transit_accessible":false,"fenced":false,"source_url":"https://lawrencehallofscience.org/visitors/plan-your-visit/","source_confidence":5,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-004';

UPDATE public.activityspots
SET
  sensory_friendly = FALSE,
  transit_accessible = FALSE,
  fenced = TRUE,
  source_url = 'https://berkeleyca.gov/community-recreation/parks-recreation/facilities/adventure-playground',
  source_confidence = 5,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-005","name":"Berkeley Adventure Playground","description":"Free weekend outdoor play space at the Berkeley Marina where kids climb kid-built forts, ride the zip line, and create with hammers, saws, paint, and recycled materials. Children under 18 must have a supervising adult.","primary_category":"Fun","subtype":"Adventure Playground","activity_type":["outdoor","playground","arts"],"age_buckets":["3-5","6-8","9-12"],"age_min":4,"age_max":12,"involvement":"supervise","min_price":0,"max_price":0,"booking_required":false,"location_address":"160 University Avenue, Berkeley, CA 94710","city":"Berkeley","location_lat":37.8636,"location_lon":-122.3139,"location_environment":"outdoor","duration_minutes":90,"duration_max_minutes":180,"rain_suitable":false,"tags":["free","outdoor","climbing","building","elementary","weekend-special","editors-pick"],"season":["year-round","weekends-only"],"highlights":["Ride the famous zip line","Hammer wood into kid forts","Paint and build with recycled pieces"],"excitement_score":5,"imageurlthumb":"https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://berkeleyca.gov/community-recreation/parks-recreation/facilities/adventure-playground","country_code":"US","sensory_friendly":false,"transit_accessible":false,"fenced":true,"source_url":"https://berkeleyca.gov/community-recreation/parks-recreation/facilities/adventure-playground","source_confidence":5,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-005';

UPDATE public.activityspots
SET
  sensory_friendly = TRUE,
  transit_accessible = TRUE,
  fenced = TRUE,
  source_url = 'https://www.habitot.org/',
  source_confidence = 4,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-006","name":"Habitot Children''s Museum","description":"Early-childhood hands-on discovery museum organization founded for infants, toddlers, and preschoolers, with play exhibits, art, maker programs, and family outreach. Historic downtown Berkeley venue records list 2065 Kittredge Street; current Habitot programming should be checked before visiting.","primary_category":"Fun","subtype":"Children''s Museum","activity_type":["indoor","museum","arts","educational"],"age_buckets":["0-2","3-5","6-8"],"age_min":0,"age_max":7,"involvement":"active_together","min_price":0,"max_price":12,"booking_required":false,"location_address":"2065 Kittredge Street, Berkeley, CA 94704","city":"Berkeley","location_lat":37.8688,"location_lon":-122.2686,"location_environment":"indoor","duration_minutes":75,"duration_max_minutes":120,"rain_suitable":true,"tags":["rainy-day","indoor","toddler","preschool","art","close-to-bart"],"season":["year-round"],"highlights":["Play in toddler-sized exhibits","Make art in hands-on programs","Try maker activities for little kids"],"excitement_score":4,"imageurlthumb":"https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://www.habitot.org/","country_code":"US","sensory_friendly":true,"transit_accessible":true,"fenced":true,"source_url":"https://www.habitot.org/","source_confidence":4,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-006';

UPDATE public.activityspots
SET
  sensory_friendly = FALSE,
  transit_accessible = TRUE,
  fenced = FALSE,
  source_url = 'https://museumca.org/visit/',
  source_confidence = 5,
  family_fit_score = 4,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-007","name":"Oakland Museum of California","description":"California art, history, and natural sciences museum at 1000 Oak Street, with gardens, family-friendly galleries, and easy transit access near Lake Merritt BART. OMCA visitor listings show paid general admission and Wednesday through Sunday public hours.","primary_category":"Culture","subtype":"Museum","activity_type":["indoor","museum","educational","arts"],"age_buckets":["3-5","6-8","9-12","13+"],"age_min":4,"age_max":17,"involvement":"active_together","min_price":0,"max_price":20,"booking_required":false,"location_address":"1000 Oak Street, Oakland, CA 94607","city":"Oakland","location_lat":37.7986,"location_lon":-122.2644,"location_environment":"indoor","duration_minutes":90,"duration_max_minutes":180,"rain_suitable":true,"tags":["rainy-day","art","indoor","elementary","teen","close-to-bart"],"season":["year-round"],"highlights":["Explore California history galleries","Walk through museum gardens","Find art made in Oakland"],"excitement_score":3,"imageurlthumb":"https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://museumca.org/visit/","country_code":"US","sensory_friendly":false,"transit_accessible":true,"fenced":false,"source_url":"https://museumca.org/visit/","source_confidence":5,"family_fit_score":4,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-007';

UPDATE public.activityspots
SET
  sensory_friendly = FALSE,
  transit_accessible = FALSE,
  fenced = FALSE,
  source_url = 'https://www.ebparks.org/parks/venues/merry-go-round',
  source_confidence = 4,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-008","name":"Tilden Merry-Go-Round and Steam Trains","description":"Classic Tilden Park attractions: the antique Herschell-Spillman Merry-Go-Round and the nearby Redwood Valley Railway steam train ride. East Bay Parks lists carousel rides at $4 and the steam train at 2481 Grizzly Peak Boulevard.","primary_category":"Fun","subtype":"Carousel and Train","activity_type":["outdoor","park","entertainment"],"age_buckets":["0-2","3-5","6-8","9-12"],"age_min":1,"age_max":12,"involvement":"active_together","min_price":4,"max_price":6,"booking_required":false,"location_address":"Central Park Drive & Lake Anza Road, Berkeley, CA 94708","city":"Berkeley","location_lat":37.891,"location_lon":-122.245,"location_environment":"outdoor","duration_minutes":60,"duration_max_minutes":150,"rain_suitable":false,"tags":["under-$10","outdoor","trains","toddler","preschool","elementary","weekend-special"],"season":["year-round","weekends-only"],"highlights":["Choose a painted carousel animal","Ride a tiny steam train","Snack near Lake Anza Road"],"excitement_score":5,"imageurlthumb":"https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://www.ebparks.org/parks/venues/merry-go-round","country_code":"US","sensory_friendly":false,"transit_accessible":false,"fenced":false,"source_url":"https://www.ebparks.org/parks/venues/merry-go-round","source_confidence":4,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-008';

UPDATE public.activityspots
SET
  sensory_friendly = TRUE,
  transit_accessible = FALSE,
  fenced = FALSE,
  source_url = 'https://botanicalgarden.berkeley.edu/visit/',
  source_confidence = 5,
  family_fit_score = 4,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-009","name":"UC Botanical Garden at Berkeley","description":"34-acre living museum at 200 Centennial Drive with more than 10,000 kinds of plants, regional garden collections, weekend drop-in tours, and a garden shop. Reservations are recommended and youth admission is listed separately from adult admission.","primary_category":"Nature","subtype":"Botanical Garden","activity_type":["outdoor","garden","educational","nature"],"age_buckets":["0-2","3-5","6-8","9-12","13+"],"age_min":1,"age_max":17,"involvement":"active_together","min_price":0,"max_price":18,"booking_required":false,"location_address":"200 Centennial Drive, Berkeley, CA 94720","city":"Berkeley","location_lat":37.8756,"location_lon":-122.2385,"location_environment":"outdoor","duration_minutes":90,"duration_max_minutes":150,"rain_suitable":false,"tags":["nature","outdoor","stroller-friendly","all-ages","under-$20"],"season":["year-round"],"highlights":["Walk through giant plant collections","Find flowers from around the world","Join a weekend garden tour"],"excitement_score":3,"imageurlthumb":"https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://botanicalgarden.berkeley.edu/visit/","country_code":"US","sensory_friendly":true,"transit_accessible":false,"fenced":false,"source_url":"https://botanicalgarden.berkeley.edu/visit/","source_confidence":5,"family_fit_score":4,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-009';

UPDATE public.activityspots
SET
  sensory_friendly = FALSE,
  transit_accessible = TRUE,
  fenced = FALSE,
  source_url = 'https://ecologycenter.org/food/farmers-markets/',
  source_confidence = 5,
  family_fit_score = 3,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-010","name":"Berkeley Farmers'' Market - Downtown Saturday","description":"Open-air Ecology Center farmers'' market at Center Street and Martin Luther King Jr. Way, Saturdays 10am to 2:30pm year-round. The market lists local produce, prepared foods, flowers, music, demonstrations, and family-friendly events.","primary_category":"Social","subtype":"Farmers Market","activity_type":["outdoor","market"],"age_buckets":["0-2","3-5","6-8","9-12","13+"],"age_min":0,"age_max":17,"involvement":"active_together","min_price":0,"max_price":0,"booking_required":false,"location_address":"Center Street at Martin Luther King Jr. Way, Berkeley, CA 94703","city":"Berkeley","location_lat":37.8709,"location_lon":-122.2728,"location_environment":"outdoor","duration_minutes":45,"duration_max_minutes":90,"rain_suitable":false,"tags":["free","outdoor","urban","stroller-friendly","all-ages"],"season":["year-round","saturdays-only"],"highlights":["Pick a new fruit to taste","Listen for market musicians","Choose flowers or fresh bread"],"excitement_score":2,"imageurlthumb":"https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://ecologycenter.org/food/farmers-markets/","country_code":"US","sensory_friendly":false,"transit_accessible":true,"fenced":false,"source_url":"https://ecologycenter.org/food/farmers-markets/","source_confidence":5,"family_fit_score":3,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-010';

UPDATE public.activityspots
SET
  sensory_friendly = FALSE,
  transit_accessible = FALSE,
  fenced = FALSE,
  source_url = 'https://chabotspace.org/visit/plan-your-visit/',
  source_confidence = 5,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-011","name":"Chabot Space & Science Center","description":"Oakland science center and observatory at 10000 Skyline Boulevard with planetarium shows, exhibition galleries, and free telescope viewings on Friday and Saturday evenings when weather permits. General admission is paid, with reduced Museums for All admission.","primary_category":"Education","subtype":"Space Science Center","activity_type":["indoor","museum","science","educational"],"age_buckets":["3-5","6-8","9-12","13+"],"age_min":4,"age_max":17,"involvement":"active_together","min_price":1,"max_price":24,"booking_required":false,"location_address":"10000 Skyline Boulevard, Oakland, CA 94619","city":"Oakland","location_lat":37.8186,"location_lon":-122.1802,"location_environment":"indoor","duration_minutes":120,"duration_max_minutes":240,"rain_suitable":true,"tags":["rainy-day","science","space","indoor","elementary","teen","editors-pick"],"season":["year-round"],"highlights":["Watch a planetarium show","Look through big telescopes","Explore NASA Ames exhibits"],"excitement_score":4,"imageurlthumb":"https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://chabotspace.org/visit/plan-your-visit/","country_code":"US","sensory_friendly":false,"transit_accessible":false,"fenced":false,"source_url":"https://chabotspace.org/visit/plan-your-visit/","source_confidence":5,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-011';

UPDATE public.activityspots
SET
  sensory_friendly = FALSE,
  transit_accessible = TRUE,
  fenced = TRUE,
  source_url = 'https://fairyland.org/',
  source_confidence = 5,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-012","name":"Children''s Fairyland","description":"Ten-acre storybook theme park on Lake Merritt for families with young children, featuring nearly 60 storybook sets, kid-size rides, friendly animals, gardens, puppet shows, and hands-on fun. Adults must be accompanied by children.","primary_category":"Fun","subtype":"Storybook Theme Park","activity_type":["outdoor","park","entertainment","animals"],"age_buckets":["0-2","3-5","6-8"],"age_min":1,"age_max":8,"involvement":"active_together","min_price":0,"max_price":20,"booking_required":false,"location_address":"699 Bellevue Avenue, Oakland, CA 94610","city":"Oakland","location_lat":37.8097,"location_lon":-122.2588,"location_environment":"outdoor","duration_minutes":120,"duration_max_minutes":240,"rain_suitable":false,"tags":["outdoor","animals","toddler","preschool","elementary","editors-pick"],"season":["year-round"],"highlights":["Climb through storybook sets","Watch a puppet show","Ride kid-sized amusement rides"],"excitement_score":5,"imageurlthumb":"https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://fairyland.org/","country_code":"US","sensory_friendly":false,"transit_accessible":true,"fenced":true,"source_url":"https://fairyland.org/","source_confidence":5,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-012';

UPDATE public.activityspots
SET
  sensory_friendly = TRUE,
  transit_accessible = FALSE,
  fenced = TRUE,
  source_url = 'https://www.ebparks.org/parks/ardenwood',
  source_confidence = 5,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-013","name":"Ardenwood Historic Farm","description":"East Bay Regional Park District working historic farm in Fremont showing life on a family farm between 1890 and 1930. Kids can see sheep, chickens, rabbits, goats, cows, a hay barn, blacksmith shop, seasonal train rides, and crop demonstrations.","primary_category":"Nature","subtype":"Historic Farm","activity_type":["outdoor","farm","animals","educational","nature"],"age_buckets":["0-2","3-5","6-8","9-12"],"age_min":1,"age_max":12,"involvement":"active_together","min_price":0,"max_price":6,"booking_required":false,"location_address":"34600 Ardenwood Boulevard, Fremont, CA 94555","city":"Fremont","location_lat":37.5558,"location_lon":-122.0524,"location_environment":"outdoor","duration_minutes":120,"duration_max_minutes":240,"rain_suitable":false,"tags":["under-$10","animals","farm","nature","outdoor","toddler","elementary"],"season":["year-round"],"highlights":["Meet sheep, goats, and cows","Step inside the old hay barn","Ride the seasonal farm train"],"excitement_score":4,"imageurlthumb":"https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://www.ebparks.org/parks/ardenwood","country_code":"US","sensory_friendly":true,"transit_accessible":false,"fenced":true,"source_url":"https://www.ebparks.org/parks/ardenwood","source_confidence":5,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-013';

UPDATE public.activityspots
SET
  sensory_friendly = TRUE,
  transit_accessible = FALSE,
  fenced = TRUE,
  source_url = 'https://bayareadiscoverymuseum.org/plan-your-visit/',
  source_confidence = 5,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-014","name":"Bay Area Discovery Museum","description":"Indoor-outdoor children''s museum at Fort Baker in Sausalito, located on 7.5 acres of National Park land near the Golden Gate Bridge. The museum focuses on creative problem solving through STEM-rich play for young children.","primary_category":"Education","subtype":"Children''s Museum","activity_type":["indoor","outdoor","museum","educational","science"],"age_buckets":["0-2","3-5","6-8"],"age_min":0,"age_max":8,"involvement":"active_together","min_price":1,"max_price":18,"booking_required":false,"location_address":"557 McReynolds Road, Sausalito, CA 94965","city":"Sausalito","location_lat":37.8357,"location_lon":-122.4789,"location_environment":"both","duration_minutes":120,"duration_max_minutes":240,"rain_suitable":true,"tags":["rainy-day","science","indoor","outdoor","toddler","preschool","editors-pick"],"season":["year-round"],"highlights":["Build in hands-on STEM spaces","Play outside under the bridge","Explore toddler-friendly exhibits"],"excitement_score":5,"imageurlthumb":"https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://bayareadiscoverymuseum.org/plan-your-visit/","country_code":"US","sensory_friendly":true,"transit_accessible":false,"fenced":true,"source_url":"https://bayareadiscoverymuseum.org/plan-your-visit/","source_confidence":5,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-014';

UPDATE public.activityspots
SET
  sensory_friendly = TRUE,
  transit_accessible = TRUE,
  fenced = FALSE,
  source_url = 'https://www.ebparks.org/parks/visitor-centers/crab-cove',
  source_confidence = 5,
  family_fit_score = 4,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-015","name":"Doug Siden Visitor Center at Crab Cove","description":"Alameda shoreline visitor center and aquarium at Crown Beach with an 800-gallon aquarium system, interactive stations, bay creature displays, and marine ecology programs. The visitor center is open Wednesday through Sunday with seasonal closing hours.","primary_category":"Education","subtype":"Shoreline Visitor Center","activity_type":["indoor","museum","animals","science","nature"],"age_buckets":["0-2","3-5","6-8","9-12"],"age_min":1,"age_max":12,"involvement":"active_together","min_price":0,"max_price":5,"booking_required":false,"location_address":"1252 McKay Avenue, Alameda, CA 94501","city":"Alameda","location_lat":37.7681,"location_lon":-122.2781,"location_environment":"both","duration_minutes":60,"duration_max_minutes":150,"rain_suitable":true,"tags":["free","under-$10","rainy-day","water","animals","science","indoor","beach"],"season":["year-round"],"highlights":["See bay animals in aquariums","Build a crab from the inside","Walk outside to Crown Beach"],"excitement_score":4,"imageurlthumb":"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://www.ebparks.org/parks/visitor-centers/crab-cove","country_code":"US","sensory_friendly":true,"transit_accessible":true,"fenced":false,"source_url":"https://www.ebparks.org/parks/visitor-centers/crab-cove","source_confidence":5,"family_fit_score":4,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-015';

UPDATE public.activityspots
SET
  sensory_friendly = FALSE,
  transit_accessible = FALSE,
  fenced = TRUE,
  source_url = 'https://www.pixieland.com/',
  source_confidence = 5,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-016","name":"Pixieland Amusement Park","description":"Small outdoor amusement park in Concord designed for little kids, with seasonal hours, birthday parties, and classic tiny rides. The official site describes it as a place where little kids have big kid fun and notes that hours are weather permitting.","primary_category":"Fun","subtype":"Toddler Amusement Park","activity_type":["outdoor","entertainment"],"age_buckets":["0-2","3-5","6-8"],"age_min":1,"age_max":8,"involvement":"supervise","min_price":0,"max_price":40,"booking_required":false,"location_address":"2740 East Olivera Road, Concord, CA 94519","city":"Concord","location_lat":37.9955,"location_lon":-122.0283,"location_environment":"outdoor","duration_minutes":90,"duration_max_minutes":180,"rain_suitable":false,"tags":["outdoor","toddler","preschool","elementary","weekend-special"],"season":["spring","summer","fall","weekends-only"],"highlights":["Ride toddler-sized park rides","Choose a birthday-party ride loop","Play in a small kid-scale park"],"excitement_score":4,"imageurlthumb":"https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://www.pixieland.com/","country_code":"US","sensory_friendly":false,"transit_accessible":false,"fenced":true,"source_url":"https://www.pixieland.com/","source_confidence":5,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-016';

UPDATE public.activityspots
SET
  sensory_friendly = TRUE,
  transit_accessible = FALSE,
  fenced = FALSE,
  source_url = 'https://www.ebparks.org/parks/point-isabel',
  source_confidence = 5,
  family_fit_score = 3,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-017","name":"Point Isabel Regional Shoreline","description":"Free 23-acre Richmond shoreline park with Bay Trail access, Golden Gate Bridge views, picnic areas, fishing, kite flying, bird-watching, and unusual off-leash dog rules. East Bay Parks reports well over one million annual visitors, most with dogs.","primary_category":"Nature","subtype":"Shoreline Park","activity_type":["outdoor","park","nature"],"age_buckets":["0-2","3-5","6-8","9-12","13+"],"age_min":0,"age_max":17,"involvement":"active_together","min_price":0,"max_price":0,"booking_required":false,"location_address":"2701 Isabel Street, Richmond, CA 94804","city":"Richmond","location_lat":37.899,"location_lon":-122.3261,"location_environment":"outdoor","duration_minutes":60,"duration_max_minutes":150,"rain_suitable":false,"tags":["free","outdoor","nature","stroller-friendly","wheelchair-accessible","all-ages"],"season":["year-round"],"highlights":["Watch dogs race by the Bay","Look for the Golden Gate Bridge","Walk the flat Bay Trail"],"excitement_score":3,"imageurlthumb":"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://www.ebparks.org/parks/point-isabel","country_code":"US","sensory_friendly":true,"transit_accessible":false,"fenced":false,"source_url":"https://www.ebparks.org/parks/point-isabel","source_confidence":5,"family_fit_score":3,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-017';

UPDATE public.activityspots
SET
  sensory_friendly = TRUE,
  transit_accessible = FALSE,
  fenced = FALSE,
  source_url = 'https://www.ebparks.org/parks/coyote-hills',
  source_confidence = 5,
  family_fit_score = 4,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-018","name":"Coyote Hills Regional Park Visitor Center","description":"Fremont regional park and visitor center with marsh trails, naturalist programs, educational displays about Ohlone life, a tule reed boat, wildlife exhibits, and a bird and butterfly nectar garden. Parking fees may apply.","primary_category":"Nature","subtype":"Visitor Center and Trails","activity_type":["outdoor","indoor","park","educational","nature"],"age_buckets":["3-5","6-8","9-12","13+"],"age_min":3,"age_max":17,"involvement":"active_together","min_price":0,"max_price":5,"booking_required":false,"location_address":"8000 Patterson Ranch Road, Fremont, CA 94555","city":"Fremont","location_lat":37.5546,"location_lon":-122.0864,"location_environment":"both","duration_minutes":90,"duration_max_minutes":240,"rain_suitable":false,"tags":["under-$10","nature","outdoor","indoor","stroller-friendly","elementary","teen"],"season":["year-round"],"highlights":["See a tule reed boat","Look for marsh birds","Play Ohlone games in programs"],"excitement_score":3,"imageurlthumb":"https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://www.ebparks.org/parks/coyote-hills","country_code":"US","sensory_friendly":true,"transit_accessible":false,"fenced":false,"source_url":"https://www.ebparks.org/parks/coyote-hills","source_confidence":5,"family_fit_score":4,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-018';

UPDATE public.activityspots
SET
  sensory_friendly = FALSE,
  transit_accessible = TRUE,
  fenced = TRUE,
  source_url = 'https://presidio.gov/explore/attractions/outpost-playground',
  source_confidence = 5,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-019","name":"Presidio Tunnel Tops - Outpost Playground","description":"Free two-acre nature playscape at Presidio Tunnel Tops where kids ages 2 to 12 climb, swing, crawl, and play with water features inspired by Presidio habitats. The Presidio lists wheelchair-accessible paths, restrooms, and paid nearby parking.","primary_category":"Fun","subtype":"Nature Playground","activity_type":["outdoor","playground","nature","educational"],"age_buckets":["0-2","3-5","6-8","9-12"],"age_min":2,"age_max":12,"involvement":"supervise","min_price":0,"max_price":0,"booking_required":false,"location_address":"Presidio Tunnel Tops, 210 Lincoln Boulevard, San Francisco, CA 94129","city":"San Francisco","location_lat":37.8037,"location_lon":-122.4625,"location_environment":"outdoor","duration_minutes":90,"duration_max_minutes":180,"rain_suitable":false,"tags":["free","outdoor","climbing","water","nature","preschool","elementary","wheelchair-accessible","editors-pick"],"season":["year-round"],"highlights":["Crawl through a giant fallen tree","Climb the Woodland Wall","Splash in water-channel play"],"excitement_score":5,"imageurlthumb":"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://presidio.gov/explore/attractions/outpost-playground","country_code":"US","sensory_friendly":false,"transit_accessible":true,"fenced":true,"source_url":"https://presidio.gov/explore/attractions/outpost-playground","source_confidence":5,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-019';

UPDATE public.activityspots
SET
  sensory_friendly = FALSE,
  transit_accessible = TRUE,
  fenced = TRUE,
  source_url = 'https://www.sfrecpark.org/Facilities/Facility/Details/Koret-Childrens-Quarter-and-Carousel-414',
  source_confidence = 5,
  family_fit_score = 5,
  schema_version = 'v3.2',
  json = '{"id":"bay-area-020","name":"Koret Children''s Quarter and Carousel","description":"Golden Gate Park playground and carousel at MLK Drive and Bowling Green Drive. SF Rec and Park lists an accessible children''s play area, accessible parking, picnic area, and restroom; the playground traces its roots to the Sharon Quarters for Children opened in 1888.","primary_category":"Fun","subtype":"Playground and Carousel","activity_type":["outdoor","playground","park","entertainment"],"age_buckets":["0-2","3-5","6-8","9-12"],"age_min":1,"age_max":12,"involvement":"supervise","min_price":0,"max_price":5,"booking_required":false,"location_address":"MLK Drive and Bowling Green Drive, San Francisco, CA 94121","city":"San Francisco","location_lat":37.7679,"location_lon":-122.4595,"location_environment":"outdoor","duration_minutes":60,"duration_max_minutes":150,"rain_suitable":false,"tags":["free","under-$10","outdoor","climbing","stroller-friendly","wheelchair-accessible","toddler","elementary"],"season":["year-round"],"highlights":["Slide down the concrete hill","Ride the Golden Gate Park carousel","Climb through big play structures"],"excitement_score":4,"imageurlthumb":"https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&fit=crop","image_urls":[],"urlmoreinfo":"https://www.sfrecpark.org/Facilities/Facility/Details/Koret-Childrens-Quarter-and-Carousel-414","country_code":"US","sensory_friendly":false,"transit_accessible":true,"fenced":true,"source_url":"https://www.sfrecpark.org/Facilities/Facility/Details/Koret-Childrens-Quarter-and-Carousel-414","source_confidence":5,"family_fit_score":5,"schema_version":"v3.2","source":"bay_area_v31"}'::JSONB,
  updated_at = NOW()
WHERE id = 'bay-area-020';
