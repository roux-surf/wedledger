-- =============================================
-- WedLedger Seed Data
-- 3 planners, 9 couples, engagements, budgets, vendors, payments, milestones
--
-- INSTRUCTIONS:
-- 1. Create 12 users in Clerk (3 planners + 9 couples)
-- 2. Paste their Clerk user IDs into the variables below
-- 3. Run this entire file in the Supabase SQL Editor (bypasses RLS)
-- =============================================

DO $$
DECLARE
  -- =============================================
  -- PASTE YOUR CLERK USER IDS HERE
  -- =============================================
  v_planner1 TEXT := 'user_3B30Krxds4st0v0s4wrAAY8etfz';
  v_planner2 TEXT := 'user_3B30L5IR6xy253Xok3x23lCDfop';
  v_planner3 TEXT := 'user_3B30L5adyjkZ5d6clnqRlO3CrI2';

  v_couple1  TEXT := 'user_3B30L0yNgL0B3JTl0NAXwx6T19H';
  v_couple2  TEXT := 'user_3B30L16XddeY6pgmUkiLBFhI3Ej';
  v_couple3  TEXT := 'user_3B30L33xuz1C9ko10TsCxWflavc';
  v_couple4  TEXT := 'user_3B30LB80v42w5Ytd9vzieNGxd51';
  v_couple5  TEXT := 'user_3B30LBrWdYFqhpSazHlRwTIVnPd';
  v_couple6  TEXT := 'user_3B30L8fdHyDdO0gRkf07NsslDta';
  v_couple7  TEXT := 'user_3B30LBJe6qNKx5ZBPj5vVuQBR7G';
  v_couple8  TEXT := 'user_3B30LFeZwdNkdKh6lZmcuhWgfVR';
  v_couple9  TEXT := 'user_3B30LHEotc5IHWtHMecWajP2PN2';
  -- =============================================

  v_client_id UUID;
  v_budget_id UUID;
  v_cat_id    UUID;
  v_li_id     UUID;
BEGIN

  -- =============================================
  -- USER PROFILES
  -- =============================================

  INSERT INTO user_profiles (user_id, role, display_name, email, onboarding_completed) VALUES
    (v_planner1, 'planner', 'Sarah Mitchell',     'sarah@example.com',    true),
    (v_planner2, 'planner', 'David Chen',         'david@example.com',    true),
    (v_planner3, 'planner', 'Olivia Ramirez',     'olivia@example.com',   true),
    (v_couple1,  'couple',  'Emma & James',       'emma@example.com',     true),
    (v_couple2,  'couple',  'Priya & Raj',        'priya@example.com',    true),
    (v_couple3,  'couple',  'Megan & Tyler',      'megan@example.com',    true),
    (v_couple4,  'couple',  'Aisha & Marcus',     'aisha@example.com',    true),
    (v_couple5,  'couple',  'Sophie & Liam',      'sophie@example.com',   true),
    (v_couple6,  'couple',  'Hannah & Noah',      'hannah@example.com',   true),
    (v_couple7,  'couple',  'Chloe & Ben',        'chloe@example.com',    true),
    (v_couple8,  'couple',  'Lily & Jake',        'lily@example.com',     true),
    (v_couple9,  'couple',  'Zara & Ethan',       'zara@example.com',     true);

  -- =============================================
  -- PLANNER PROFILES
  -- =============================================

  INSERT INTO planner_profiles (user_id, bio, experience_years, specialties, city, state,
    consultation_rate_cents, subscription_rate_cents, accepting_clients, weddings_completed, profile_published) VALUES
    (v_planner1,
     'Full-service luxury wedding planner with a passion for creating timeless celebrations. I specialize in high-end destination weddings and intimate garden ceremonies. Every detail matters — from the first consultation to the last dance.',
     12, ARRAY['luxury', 'destination', 'intimate'], 'New York', 'New York',
     25000, 350000, true, 87, true),
    (v_planner2,
     'Modern wedding coordinator focused on budget-friendly celebrations that feel anything but cheap. I help couples get the most out of every dollar while keeping the planning process fun and stress-free.',
     6, ARRAY['budget-friendly', 'outdoor', 'cultural'], 'Austin', 'Texas',
     15000, 200000, true, 42, true),
    (v_planner3,
     'Bilingual wedding planner specializing in multicultural celebrations and destination events. From beach ceremonies in Mexico to vineyard weddings in Napa, I bring your unique love story to life.',
     9, ARRAY['destination', 'cultural', 'luxury'], 'Los Angeles', 'California',
     20000, 280000, true, 63, true);

  -- =============================================
  -- CLIENTS (couple wedding records)
  -- Couples 1-6: completed setup
  -- Couples 7-9: placeholder (TBD)
  -- =============================================

  INSERT INTO clients (user_id, name, wedding_date, city, state, guest_count, total_budget) VALUES
    (v_couple1, 'The Anderson Wedding',     '2026-10-17', 'Napa Valley',   'California',      150, 120000),
    (v_couple2, 'Patel-Sharma Celebration',  '2026-12-05', 'Houston',       'Texas',           300, 85000),
    (v_couple3, 'Tyler & Megan Forever',     '2027-03-21', 'Charleston',    'South Carolina',  100, 45000),
    (v_couple4, 'Johnson-Williams Wedding',  '2027-06-14', 'Atlanta',       'Georgia',         200, 75000),
    (v_couple5, 'The Murphy Wedding',        '2026-09-12', 'Chicago',       'Illinois',        175, 55000),
    (v_couple6, 'Hannah & Noah''s Day',      '2027-01-08', 'Denver',        'Colorado',        120, 65000),
    (v_couple7, 'Chloe & Ben',              '2027-06-01', 'TBD',           'TBD',             0,   0),
    (v_couple8, 'Lily & Jake',              '2027-06-01', 'TBD',           'TBD',             0,   0),
    (v_couple9, 'Zara & Ethan',             '2027-06-01', 'TBD',           'TBD',             0,   0);

  -- =============================================
  -- BUDGETS
  -- =============================================

  -- Couple 1-6 budgets with templates
  INSERT INTO budgets (client_id, template_id) SELECT id, 'luxury' FROM clients WHERE user_id = v_couple1;
  INSERT INTO budgets (client_id, template_id) SELECT id, 'lovely' FROM clients WHERE user_id = v_couple2;
  INSERT INTO budgets (client_id, template_id) SELECT id, 'diy'    FROM clients WHERE user_id = v_couple3;
  INSERT INTO budgets (client_id, template_id) SELECT id, 'lovely' FROM clients WHERE user_id = v_couple4;
  INSERT INTO budgets (client_id, template_id) SELECT id, 'diy'    FROM clients WHERE user_id = v_couple5;
  INSERT INTO budgets (client_id, template_id) SELECT id, 'lovely' FROM clients WHERE user_id = v_couple6;

  -- Placeholder budgets for TBD couples
  INSERT INTO budgets (client_id) SELECT id FROM clients WHERE user_id = v_couple7;
  INSERT INTO budgets (client_id) SELECT id FROM clients WHERE user_id = v_couple8;
  INSERT INTO budgets (client_id) SELECT id FROM clients WHERE user_id = v_couple9;

  -- =============================================
  -- CATEGORIES — helper function via loop
  -- =============================================

  -- Couple 1: Luxury template ($120k)
  SELECT b.id INTO v_budget_id FROM budgets b JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1;
  INSERT INTO categories (budget_id, name, target_amount, sort_order) VALUES
    (v_budget_id, 'Venue',         30000, 0), (v_budget_id, 'Catering',      24000, 1),
    (v_budget_id, 'Bar',            8400, 2), (v_budget_id, 'Floral',        14400, 3),
    (v_budget_id, 'Rentals',        7200, 4), (v_budget_id, 'Planner Fee',    9600, 5),
    (v_budget_id, 'Entertainment',  9600, 6), (v_budget_id, 'Photography',   10800, 7),
    (v_budget_id, 'Misc',           6000, 8);

  -- Couple 2: Lovely template ($85k)
  SELECT b.id INTO v_budget_id FROM budgets b JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple2;
  INSERT INTO categories (budget_id, name, target_amount, sort_order) VALUES
    (v_budget_id, 'Venue',         23800, 0), (v_budget_id, 'Catering',      19550, 1),
    (v_budget_id, 'Bar',            6800, 2), (v_budget_id, 'Floral',         6800, 3),
    (v_budget_id, 'Rentals',        4250, 4), (v_budget_id, 'Planner Fee',    4250, 5),
    (v_budget_id, 'Entertainment',  6800, 6), (v_budget_id, 'Photography',    8500, 7),
    (v_budget_id, 'Misc',           4250, 8);

  -- Couple 3: DIY template ($45k)
  SELECT b.id INTO v_budget_id FROM budgets b JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple3;
  INSERT INTO categories (budget_id, name, target_amount, sort_order) VALUES
    (v_budget_id, 'Venue',         13500, 0), (v_budget_id, 'Catering',      11250, 1),
    (v_budget_id, 'Bar',            3600, 2), (v_budget_id, 'Floral',         2250, 3),
    (v_budget_id, 'Rentals',        2250, 4), (v_budget_id, 'Planner Fee',     900, 5),
    (v_budget_id, 'Entertainment',  3600, 6), (v_budget_id, 'Photography',    5400, 7),
    (v_budget_id, 'Misc',           2250, 8);

  -- Couple 4: Lovely template ($75k)
  SELECT b.id INTO v_budget_id FROM budgets b JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple4;
  INSERT INTO categories (budget_id, name, target_amount, sort_order) VALUES
    (v_budget_id, 'Venue',         21000, 0), (v_budget_id, 'Catering',      17250, 1),
    (v_budget_id, 'Bar',            6000, 2), (v_budget_id, 'Floral',         6000, 3),
    (v_budget_id, 'Rentals',        3750, 4), (v_budget_id, 'Planner Fee',    3750, 5),
    (v_budget_id, 'Entertainment',  6000, 6), (v_budget_id, 'Photography',    7500, 7),
    (v_budget_id, 'Misc',           3750, 8);

  -- Couple 5: DIY template ($55k)
  SELECT b.id INTO v_budget_id FROM budgets b JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple5;
  INSERT INTO categories (budget_id, name, target_amount, sort_order) VALUES
    (v_budget_id, 'Venue',         16500, 0), (v_budget_id, 'Catering',      13750, 1),
    (v_budget_id, 'Bar',            4400, 2), (v_budget_id, 'Floral',         2750, 3),
    (v_budget_id, 'Rentals',        2750, 4), (v_budget_id, 'Planner Fee',    1100, 5),
    (v_budget_id, 'Entertainment',  4400, 6), (v_budget_id, 'Photography',    6600, 7),
    (v_budget_id, 'Misc',           2750, 8);

  -- Couple 6: Lovely template ($65k)
  SELECT b.id INTO v_budget_id FROM budgets b JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple6;
  INSERT INTO categories (budget_id, name, target_amount, sort_order) VALUES
    (v_budget_id, 'Venue',         18200, 0), (v_budget_id, 'Catering',      14950, 1),
    (v_budget_id, 'Bar',            5200, 2), (v_budget_id, 'Floral',         5200, 3),
    (v_budget_id, 'Rentals',        3250, 4), (v_budget_id, 'Planner Fee',    3250, 5),
    (v_budget_id, 'Entertainment',  5200, 6), (v_budget_id, 'Photography',    6500, 7),
    (v_budget_id, 'Misc',           3250, 8);

  -- =============================================
  -- LINE ITEMS (vendors)
  -- =============================================

  -- == Couple 1: Napa luxury ($120k) ==

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1 AND cat.name = 'Venue';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Meadowood Estate',     28000, 28500, 14250, 'contracted', 'events@meadowood.com',        'Ceremony + reception, 6hr block', 0),
    (v_cat_id, 'Chairs & Staging Co',   2500,  2500,     0, 'booked',     'info@chairsandstaging.com',   'Ceremony arch + extra seating', 1);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1 AND cat.name = 'Catering';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Napa Farm Table',      22000, 23000, 11500, 'contracted', 'catering@napafarmtable.com',  '3-course plated dinner, 150 guests', 0),
    (v_cat_id, 'Sweet Things Bakery',   2800,  2800,   500, 'booked',     'orders@sweetthings.com',      '4-tier custom cake', 1);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1 AND cat.name = 'Bar';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Valley Wine Service',   7500,  8000,  4000, 'contracted', 'service@valleywine.com',      'Open bar 5hrs, local wines featured', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1 AND cat.name = 'Floral';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Bloom & Vine Studio',  13000, 14000,  7000, 'contracted', 'studio@bloomvine.com',        'Bridal party + ceremony + centerpieces', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1 AND cat.name = 'Photography';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Aria Visions',         10000, 10000,  3000, 'contracted', 'book@ariavisions.com',        '10hr coverage, 2 shooters, album', 0),
    (v_cat_id, 'Reel Moments Video',    4500,  4500,  1500, 'booked',     'hello@reelmoments.com',       'Highlight reel + full ceremony', 1);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1 AND cat.name = 'Entertainment';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'The Vineyard Band',     8500,  8500,  2000, 'booked',     'booking@vineyardband.com',    '4-piece band, ceremony + reception', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1 AND cat.name = 'Rentals';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Luxe Event Rentals',    6500,  7000,  3500, 'contracted', 'orders@luxerentals.com',      'Linens, tableware, lounge furniture', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1 AND cat.name = 'Planner Fee';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Sarah Mitchell Events', 9600,  9600,  4800, 'contracted', 'sarah@example.com',           'Full-service coordination', 0);

  -- == Couple 2: Houston cultural ($85k) ==

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple2 AND cat.name = 'Venue';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'The Grand Haveli',     22000, 22000, 11000, 'contracted', 'events@grandhaveli.com',      'Ballroom + outdoor terrace, full day', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple2 AND cat.name = 'Catering';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Saffron & Spice',      18000, 18500,  5000, 'booked',     'info@saffronspice.com',       'Indo-fusion menu, 300 guests', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple2 AND cat.name = 'Bar';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Houston Beverage Co',   6000,  6000,  1500, 'booked',     'events@houstonbev.com',       'Chai bar + traditional cocktails', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple2 AND cat.name = 'Floral';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Lotus Garden Florals',  6500,  6500,  2000, 'booked',     'hello@lotusgarden.com',       'Marigold mandap + centerpieces', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple2 AND cat.name = 'Photography';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Golden Frame Studios',  8000,  8000,  2500, 'contracted', 'book@goldenframe.com',        'Full day, 2 shooters', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple2 AND cat.name = 'Entertainment';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'DJ Rhythm Nation',      5500,  5500,     0, 'inquired',   'dj@rhythmnation.com',         'Dhol + DJ set for sangeet & reception', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple2 AND cat.name = 'Rentals';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Elegant Affairs Rental', 4000,  4000,  1000, 'booked',    'orders@elegantaffairs.com',   'Mandap draping, cushions', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple2 AND cat.name = 'Planner Fee';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'David Chen Planning',   4250,  4250,  2125, 'contracted', 'david@example.com',           'Coordination package', 0);

  -- == Couple 3: Charleston intimate ($45k) ==

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple3 AND cat.name = 'Venue';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Magnolia Plantation',   12000, 12000,  6000, 'contracted', 'events@magnoliaplantation.com', 'Garden ceremony + carriage house reception', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple3 AND cat.name = 'Catering';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Lowcountry Kitchen',    10000, 10000,  2500, 'booked',     'hello@lowcountrykitchen.com',   'Southern buffet, 100 guests', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple3 AND cat.name = 'Bar';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Craft Bar Charleston',   3200,  3200,     0, 'inquired',   'info@craftbarchs.com',          'Signature cocktails + beer/wine', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple3 AND cat.name = 'Photography';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Charleston Lens',        5000,  5000,  1500, 'booked',     'book@charlestonlens.com',       '8hr coverage, engagement session included', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple3 AND cat.name = 'Floral';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Wildflower Workshop',    2000,  2000,     0, 'inquired',   'studio@wildflowerws.com',       'Bridal bouquet + loose arrangements', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple3 AND cat.name = 'Entertainment';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Acoustic Duo CHS',      2500,  2500,     0, 'inquired',   'play@acousticduochs.com',       'Ceremony + cocktail hour', 0);

  -- == Couple 4: Atlanta ($75k) ==

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple4 AND cat.name = 'Venue';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'The Biltmore Ballroom', 20000, 20000, 10000, 'contracted', 'events@biltmoreballroom.com', 'Historic ballroom, 200 capacity', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple4 AND cat.name = 'Catering';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Peachtree Catering',    16000, 16000,  4000, 'booked',     'info@peachtreecatering.com',  'Southern-fusion plated dinner', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple4 AND cat.name = 'Bar';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'ATL Bar Services',       5500,  5500,     0, 'booked',     'bars@atlbarservices.com',     'Premium open bar 4hrs', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple4 AND cat.name = 'Floral';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Petals ATL',            5500,  5500,  1500, 'booked',     'hello@petalsatl.com',         'Modern arrangements, greenery focus', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple4 AND cat.name = 'Photography';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Snap & Story',          7000,  7000,  2000, 'contracted', 'book@snapandstory.com',       'Full day + engagement session', 0);

  -- == Couple 5: Chicago ($55k) ==

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple5 AND cat.name = 'Venue';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Skyline Loft',          15000, 15000,  7500, 'contracted', 'events@skylineloft.com',      'Rooftop ceremony + indoor reception', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple5 AND cat.name = 'Catering';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Windy City Bites',      12000, 12000,     0, 'inquired',   'hello@windycitybites.com',    'Italian-inspired family style', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple5 AND cat.name = 'Photography';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Chi Town Photos',        6000,  6000,  1800, 'booked',     'book@chitownphotos.com',      '10hr coverage', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple5 AND cat.name = 'Floral';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'The Flower Bar',         2500,  2500,     0, 'inquired',   'info@theflowerbar.com',       'Seasonal wildflower arrangements', 0);

  -- == Couple 6: Denver ($65k) ==

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple6 AND cat.name = 'Venue';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Mountain View Lodge',   17000, 17000,  8500, 'contracted', 'events@mtviewlodge.com',        'Ski lodge ceremony + fireside reception', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple6 AND cat.name = 'Catering';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Rocky Mountain Eats',   14000, 14000,  3500, 'booked',     'catering@rockymtneats.com',     'Elevated comfort food, 120 guests', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple6 AND cat.name = 'Bar';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Denver Pour House',      5000,  5000,  1000, 'booked',     'events@denverpour.com',         'Craft cocktails + Colorado beers', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple6 AND cat.name = 'Photography';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Alpine Lens',            6200,  6200,  2000, 'contracted', 'hello@alpinelens.com',           'Full day + snowy portraits', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple6 AND cat.name = 'Floral';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Evergreen Florals',      4800,  4800,  1200, 'booked',     'studio@evergreenflorals.com',    'Pine & rose winter arrangements', 0);

  SELECT cat.id INTO v_cat_id FROM categories cat JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple6 AND cat.name = 'Entertainment';
  INSERT INTO line_items (category_id, vendor_name, estimated_cost, actual_cost, paid_to_date, booking_status, vendor_email, notes, sort_order) VALUES
    (v_cat_id, 'Mountain Melody Band',   4800,  4800,     0, 'inquired',   'book@mountainmelody.com',        '5-piece band, ceremony + reception', 0);

  -- =============================================
  -- PAYMENTS
  -- =============================================

  -- Couple 1 payments
  SELECT li.id INTO v_li_id FROM line_items li JOIN categories cat ON cat.id = li.category_id JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1 AND li.vendor_name = 'Meadowood Estate';
  INSERT INTO payments (line_item_id, label, amount, due_date, status, paid_date) VALUES
    (v_li_id, 'Deposit',       14250, '2026-01-15', 'paid',    '2026-01-15'),
    (v_li_id, 'Final payment', 14250, '2026-10-03', 'pending', NULL);

  SELECT li.id INTO v_li_id FROM line_items li JOIN categories cat ON cat.id = li.category_id JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1 AND li.vendor_name = 'Napa Farm Table';
  INSERT INTO payments (line_item_id, label, amount, due_date, status, paid_date) VALUES
    (v_li_id, 'Deposit',       11500, '2026-02-01', 'paid',    '2026-02-01'),
    (v_li_id, 'Final payment', 11500, '2026-10-10', 'pending', NULL);

  SELECT li.id INTO v_li_id FROM line_items li JOIN categories cat ON cat.id = li.category_id JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1 AND li.vendor_name = 'Bloom & Vine Studio';
  INSERT INTO payments (line_item_id, label, amount, due_date, status, paid_date) VALUES
    (v_li_id, 'Deposit',       7000, '2026-03-01', 'paid',    '2026-03-01'),
    (v_li_id, 'Final payment', 7000, '2026-10-10', 'pending', NULL);

  SELECT li.id INTO v_li_id FROM line_items li JOIN categories cat ON cat.id = li.category_id JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1 AND li.vendor_name = 'Aria Visions';
  INSERT INTO payments (line_item_id, label, amount, due_date, status, paid_date) VALUES
    (v_li_id, 'Retainer',      3000, '2026-02-15', 'paid',    '2026-02-15'),
    (v_li_id, 'Final payment', 7000, '2026-10-24', 'pending', NULL);

  SELECT li.id INTO v_li_id FROM line_items li JOIN categories cat ON cat.id = li.category_id JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple1 AND li.vendor_name = 'The Vineyard Band';
  INSERT INTO payments (line_item_id, label, amount, due_date, status, paid_date) VALUES
    (v_li_id, 'Deposit',       2000, '2026-04-01', 'paid',    '2026-04-01'),
    (v_li_id, 'Final payment', 6500, '2026-10-10', 'pending', NULL);

  -- Couple 2 payments
  SELECT li.id INTO v_li_id FROM line_items li JOIN categories cat ON cat.id = li.category_id JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple2 AND li.vendor_name = 'The Grand Haveli';
  INSERT INTO payments (line_item_id, label, amount, due_date, status, paid_date) VALUES
    (v_li_id, 'Deposit',       11000, '2026-03-01', 'paid',    '2026-03-01'),
    (v_li_id, 'Final payment', 11000, '2026-11-28', 'pending', NULL);

  SELECT li.id INTO v_li_id FROM line_items li JOIN categories cat ON cat.id = li.category_id JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple2 AND li.vendor_name = 'Saffron & Spice';
  INSERT INTO payments (line_item_id, label, amount, due_date, status, paid_date) VALUES
    (v_li_id, 'Deposit', 5000, '2026-04-01', 'paid',    '2026-04-01'),
    (v_li_id, 'Balance', 13500, '2026-11-28', 'pending', NULL);

  SELECT li.id INTO v_li_id FROM line_items li JOIN categories cat ON cat.id = li.category_id JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple2 AND li.vendor_name = 'Golden Frame Studios';
  INSERT INTO payments (line_item_id, label, amount, due_date, status, paid_date) VALUES
    (v_li_id, 'Retainer',      2500, '2026-03-15', 'paid',    '2026-03-15'),
    (v_li_id, 'Final payment', 5500, '2026-12-12', 'pending', NULL);

  -- Couple 3 payments
  SELECT li.id INTO v_li_id FROM line_items li JOIN categories cat ON cat.id = li.category_id JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple3 AND li.vendor_name = 'Magnolia Plantation';
  INSERT INTO payments (line_item_id, label, amount, due_date, status, paid_date) VALUES
    (v_li_id, 'Deposit',       6000, '2026-06-01', 'paid',    '2026-06-01'),
    (v_li_id, 'Final payment', 6000, '2027-03-07', 'pending', NULL);

  SELECT li.id INTO v_li_id FROM line_items li JOIN categories cat ON cat.id = li.category_id JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple3 AND li.vendor_name = 'Lowcountry Kitchen';
  INSERT INTO payments (line_item_id, label, amount, due_date, status, paid_date) VALUES
    (v_li_id, 'Deposit',       2500, '2026-07-01', 'paid',    '2026-07-01'),
    (v_li_id, 'Final payment', 7500, '2027-03-14', 'pending', NULL);

  SELECT li.id INTO v_li_id FROM line_items li JOIN categories cat ON cat.id = li.category_id JOIN budgets b ON b.id = cat.budget_id JOIN clients c ON c.id = b.client_id WHERE c.user_id = v_couple3 AND li.vendor_name = 'Charleston Lens';
  INSERT INTO payments (line_item_id, label, amount, due_date, status, paid_date) VALUES
    (v_li_id, 'Retainer',      1500, '2026-08-01', 'paid',    '2026-08-01'),
    (v_li_id, 'Final payment', 3500, '2027-04-01', 'pending', NULL);

  -- =============================================
  -- MILESTONES
  -- =============================================

  -- Couple 1 milestones (Oct 2026 wedding)
  SELECT id INTO v_client_id FROM clients WHERE user_id = v_couple1;
  INSERT INTO milestones (client_id, title, description, months_before, target_date, status, sort_order, is_custom) VALUES
    (v_client_id, 'Book venue',              'Finalize venue contract and pay deposit',   12, '2025-10-17', 'completed',   0, false),
    (v_client_id, 'Hire photographer',       'Book photography team',                    10, '2025-12-17', 'completed',   1, false),
    (v_client_id, 'Book caterer',            'Finalize menu and contract',                9, '2026-01-17', 'completed',   2, false),
    (v_client_id, 'Book florist',            'Design consultation and contract',          8, '2026-02-17', 'completed',   3, false),
    (v_client_id, 'Book entertainment',      'Band/DJ contract',                          7, '2026-03-17', 'completed',   4, false),
    (v_client_id, 'Send invitations',        'Mail formal invitations',                   3, '2026-07-17', 'in_progress', 5, false),
    (v_client_id, 'Final dress fitting',     'Last alterations appointment',              2, '2026-08-17', 'not_started', 6, false),
    (v_client_id, 'Confirm final headcount', 'Get final RSVPs and confirm with vendors',  1, '2026-09-17', 'not_started', 7, false),
    (v_client_id, 'Final walkthrough',       'Day-of walkthrough with venue + vendors', 0.5, '2026-10-03', 'not_started', 8, false);

  -- Couple 2 milestones (Dec 2026 wedding)
  SELECT id INTO v_client_id FROM clients WHERE user_id = v_couple2;
  INSERT INTO milestones (client_id, title, description, months_before, target_date, status, sort_order, is_custom) VALUES
    (v_client_id, 'Book venue',            'Reserve The Grand Haveli',                 12, '2025-12-05', 'completed',   0, false),
    (v_client_id, 'Book caterer',          'Finalize Indo-fusion menu',                 9, '2026-03-05', 'completed',   1, false),
    (v_client_id, 'Hire photographer',     'Book Golden Frame Studios',                 8, '2026-04-05', 'completed',   2, false),
    (v_client_id, 'Book florist',          'Mandap and decor design meeting',           7, '2026-05-05', 'in_progress', 3, false),
    (v_client_id, 'Sangeet planning',      'Entertainment and venue for sangeet night', 6, '2026-06-05', 'not_started', 4, false),
    (v_client_id, 'Send invitations',      'Mail invitations (bilingual)',              3, '2026-09-05', 'not_started', 5, false),
    (v_client_id, 'Mehndi party planning', 'Arrange mehndi artist and venue',           2, '2026-10-05', 'not_started', 6, false),
    (v_client_id, 'Final headcount',       'Confirm with all vendors',                  1, '2026-11-05', 'not_started', 7, false);

  -- Couple 3 milestones (Mar 2027 wedding)
  SELECT id INTO v_client_id FROM clients WHERE user_id = v_couple3;
  INSERT INTO milestones (client_id, title, description, months_before, target_date, status, sort_order, is_custom) VALUES
    (v_client_id, 'Book venue',           'Magnolia Plantation contract',             12, '2026-03-21', 'completed',   0, false),
    (v_client_id, 'Book caterer',         'Tasting and contract',                      9, '2026-06-21', 'completed',   1, false),
    (v_client_id, 'Hire photographer',    'Book Charleston Lens',                      8, '2026-07-21', 'in_progress', 2, false),
    (v_client_id, 'Choose wedding party', 'Finalize bridesmaids and groomsmen',        7, '2026-08-21', 'not_started', 3, false),
    (v_client_id, 'Book florist',         'Meet with Wildflower Workshop',             6, '2026-09-21', 'not_started', 4, false),
    (v_client_id, 'Book entertainment',   'Ceremony music and reception',              5, '2026-10-21', 'not_started', 5, false),
    (v_client_id, 'Send invitations',     'Mail invitations',                          3, '2026-12-21', 'not_started', 6, false),
    (v_client_id, 'Final headcount',      'Confirm RSVPs',                             1, '2027-02-21', 'not_started', 7, false);

  -- =============================================
  -- ENGAGEMENTS
  -- =============================================

  -- Planner 1 (Sarah): subscription with couple 1, consultation with couple 4, pending from couple 7
  SELECT id INTO v_client_id FROM clients WHERE user_id = v_couple1;
  INSERT INTO engagements (planner_user_id, couple_user_id, client_id, type, status, rate_cents, message) VALUES
    (v_planner1, v_couple1, v_client_id, 'subscription', 'active', 350000,
     'We are planning a luxury vineyard wedding in Napa for October 2026. We need full-service coordination including vendor management, design, and day-of execution. Budget is around $120k.');

  SELECT id INTO v_client_id FROM clients WHERE user_id = v_couple4;
  INSERT INTO engagements (planner_user_id, couple_user_id, client_id, type, status, rate_cents, message, scheduled_at) VALUES
    (v_planner1, v_couple4, v_client_id, 'consultation', 'accepted', 25000,
     'We are planning a summer wedding in Atlanta and would love your advice on venue selection and budget allocation. We have about $75k to work with and 200 guests.',
     '2026-04-10 14:00:00');

  INSERT INTO engagements (planner_user_id, couple_user_id, type, status, rate_cents, message) VALUES
    (v_planner1, v_couple7, 'consultation', 'pending', 25000,
     'We just got engaged and are starting to think about planning. Would love to chat about what full-service planning looks like and whether it is right for us.');

  -- Planner 2 (David): subscription with couple 2, consultation with couple 5, pending from couple 8
  SELECT id INTO v_client_id FROM clients WHERE user_id = v_couple2;
  INSERT INTO engagements (planner_user_id, couple_user_id, client_id, type, status, rate_cents, message) VALUES
    (v_planner2, v_couple2, v_client_id, 'subscription', 'active', 200000,
     'Planning a large cultural wedding in Houston for 300 guests. We need help managing the multi-event weekend (mehndi, sangeet, ceremony, reception) on an $85k budget.');

  SELECT id INTO v_client_id FROM clients WHERE user_id = v_couple5;
  INSERT INTO engagements (planner_user_id, couple_user_id, client_id, type, status, rate_cents, message, scheduled_at) VALUES
    (v_planner2, v_couple5, v_client_id, 'consultation', 'accepted', 15000,
     'Looking for advice on our Chicago rooftop wedding. We have a venue booked but need help with the rest of the vendor lineup. Budget is $55k for 175 guests.',
     '2026-04-15 10:00:00');

  INSERT INTO engagements (planner_user_id, couple_user_id, type, status, rate_cents, message) VALUES
    (v_planner2, v_couple8, 'subscription', 'pending', 200000,
     'We are looking for an affordable but beautiful wedding and heard you specialize in budget-friendly celebrations. We would love ongoing planning support.');

  -- Planner 3 (Olivia): subscription with couple 3, consultation with couple 6, pending from couple 9
  SELECT id INTO v_client_id FROM clients WHERE user_id = v_couple3;
  INSERT INTO engagements (planner_user_id, couple_user_id, client_id, type, status, rate_cents, message) VALUES
    (v_planner3, v_couple3, v_client_id, 'subscription', 'active', 280000,
     'Planning an intimate destination-style wedding in Charleston. 100 guests, $45k budget. Looking for someone to help coordinate the southern charm vibe we want.');

  SELECT id INTO v_client_id FROM clients WHERE user_id = v_couple6;
  INSERT INTO engagements (planner_user_id, couple_user_id, client_id, type, status, rate_cents, message, scheduled_at) VALUES
    (v_planner3, v_couple6, v_client_id, 'consultation', 'accepted', 20000,
     'We are doing a winter wedding in Denver and need advice on mountain venue logistics and cold-weather contingency planning. Budget is $65k.',
     '2026-04-20 11:00:00');

  INSERT INTO engagements (planner_user_id, couple_user_id, type, status, rate_cents, message) VALUES
    (v_planner3, v_couple9, 'consultation', 'pending', 20000,
     'We are interested in a destination wedding, possibly Mexico or the Caribbean. Would love to discuss options and what that looks like budget-wise.');

  RAISE NOTICE 'Seed data inserted successfully!';
END $$;

-- =============================================
-- Summary:
-- =============================================
-- 3 planners (published profiles, different specialties/rates)
-- 9 couples:
--   Couples 1-6: wedding set up with budgets, categories, vendors
--   Couples 7-9: placeholder (TBD) — haven't completed setup
-- 9 engagements:
--   3 active subscriptions (full edit access for planner)
--   3 accepted consultations (read-only access for planner)
--   3 pending requests (from TBD couples)
-- Vendors, payments, and milestones for couples 1-3
-- Vendors for couples 4-6
