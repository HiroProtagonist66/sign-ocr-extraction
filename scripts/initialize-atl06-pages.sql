-- Initialize ATL06 Pages in Database
-- Run this script in Supabase SQL Editor to create all 119 pages

-- Step 1: Create or get site
INSERT INTO sites (name, location, created_at)
VALUES ('ATL06', 'Atlanta, GA', NOW())
ON CONFLICT (name) DO NOTHING;

-- Step 2: Create or get area
INSERT INTO slp_areas (site_id, name, description)
SELECT 
  s.id,
  'Main Building',
  'Primary datacenter building'
FROM sites s
WHERE s.name = 'ATL06'
ON CONFLICT DO NOTHING;

-- Step 3: Create pages (if they don't exist)
INSERT INTO slp_pages (area_id, page_number, image_storage_path, created_at)
SELECT 
  a.id,
  page_num.n,
  '/plans/atl06/page_' || LPAD(page_num.n::text, 2, '0') || '.png',
  NOW()
FROM slp_areas a
JOIN sites s ON a.site_id = s.id
CROSS JOIN generate_series(1, 119) AS page_num(n)
WHERE s.name = 'ATL06'
  AND a.name = 'Main Building'
  AND NOT EXISTS (
    SELECT 1 FROM slp_pages p 
    WHERE p.area_id = a.id 
    AND p.page_number = page_num.n
  );

-- Verify creation
SELECT 
  COUNT(*) as total_pages,
  COUNT(sign_type_code) as assigned_pages
FROM slp_pages p
JOIN slp_areas a ON p.area_id = a.id
JOIN sites s ON a.site_id = s.id
WHERE s.name = 'ATL06';