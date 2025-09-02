-- Complete ATL06 Database Initialization
-- Run this in Supabase SQL Editor if the UI initialization fails
-- This handles UUID generation and proper foreign key relationships

-- Start transaction
BEGIN;

-- Step 1: Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Check and potentially disable RLS temporarily
-- Uncomment these lines if you're getting permission errors:
-- ALTER TABLE sites DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE slp_areas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE slp_pages DISABLE ROW LEVEL SECURITY;

-- Step 3: Create or get the site
INSERT INTO sites (id, name, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ATL06',
  NOW(),
  NOW()
)
ON CONFLICT (name) DO UPDATE
SET updated_at = NOW()
RETURNING id;

-- Store the site ID for use below
WITH site_info AS (
  SELECT id FROM sites WHERE name = 'ATL06' LIMIT 1
)

-- Step 4: Create or get the area
INSERT INTO slp_areas (id, site_id, name, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  site_info.id,
  'Main Building',
  NOW(),
  NOW()
FROM site_info
ON CONFLICT (site_id, name) DO UPDATE
SET updated_at = NOW();

-- Step 5: Create all 119 pages
WITH area_info AS (
  SELECT sa.id AS area_id
  FROM slp_areas sa
  JOIN sites s ON sa.site_id = s.id
  WHERE s.name = 'ATL06' 
  AND sa.name = 'Main Building'
  LIMIT 1
)
INSERT INTO slp_pages (
  id,
  slp_area_id,
  page_number,
  image_storage_path,
  image_width_pixels,
  image_height_pixels,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  area_info.area_id,
  page_num,
  'atl06/page_' || LPAD(page_num::text, 2, '0') || '_full.png',
  1920,
  1080,
  NOW(),
  NOW()
FROM area_info
CROSS JOIN generate_series(1, 119) AS page_num
ON CONFLICT (slp_area_id, page_number) DO NOTHING;

-- Step 6: Verify the results
DO $$
DECLARE
  page_count INTEGER;
  site_id UUID;
  area_id UUID;
BEGIN
  -- Get counts
  SELECT s.id INTO site_id FROM sites s WHERE s.name = 'ATL06';
  SELECT sa.id INTO area_id FROM slp_areas sa WHERE sa.site_id = site_id AND sa.name = 'Main Building';
  SELECT COUNT(*) INTO page_count FROM slp_pages sp WHERE sp.slp_area_id = area_id;
  
  -- Report results
  RAISE NOTICE 'Site ID: %', site_id;
  RAISE NOTICE 'Area ID: %', area_id;
  RAISE NOTICE 'Pages created: %', page_count;
  
  IF page_count < 119 THEN
    RAISE WARNING 'Only % pages created, expected 119', page_count;
  END IF;
END $$;

-- Commit the transaction
COMMIT;

-- Final verification query
SELECT 
  s.name AS site_name,
  sa.name AS area_name,
  COUNT(sp.id) AS total_pages,
  MIN(sp.page_number) AS first_page,
  MAX(sp.page_number) AS last_page,
  COUNT(sp.sign_type_code) AS assigned_pages
FROM slp_pages sp
JOIN slp_areas sa ON sp.slp_area_id = sa.id
JOIN sites s ON sa.site_id = s.id
WHERE s.name = 'ATL06'
GROUP BY s.name, sa.name;

-- Optional: Re-enable RLS if it was disabled
-- Uncomment these if you disabled RLS above:
-- ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE slp_areas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE slp_pages ENABLE ROW LEVEL SECURITY;

-- Optional: Add policies for authenticated users if needed
-- This allows any authenticated user to read and insert
/*
CREATE POLICY "Allow authenticated read" ON sites
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON sites
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read" ON slp_areas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON slp_areas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read" ON slp_pages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON slp_pages
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON slp_pages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
*/