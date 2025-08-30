-- Sign Extraction Test Data Population Script
-- This script populates the database with test data for the interactive site plans feature
-- Run this after extracting signs from PDFs to create hotspots in the database

-- ============================================================================
-- SITES DATA
-- ============================================================================

-- Insert test site (FTY02) if it doesn't exist
INSERT INTO sites (id, name, created_at, updated_at)
VALUES (
  'fty02-test-site',
  'FTY02 - Microsoft Data Center (Test)',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ============================================================================
-- AREAS DATA
-- ============================================================================

-- Insert test areas for FTY02
INSERT INTO project_areas (id, site_id, name, area_type, created_at, updated_at)
VALUES 
  ('fty02-admin-area', 'fty02-test-site', 'Admin', 'admin', NOW(), NOW()),
  ('fty02-colo1-area', 'fty02-test-site', 'Colo 1', 'colo', NOW(), NOW()),
  ('fty02-colo2-area', 'fty02-test-site', 'Colo 2', 'colo', NOW(), NOW()),
  ('fty02-site-area', 'fty02-test-site', 'Site', 'site', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ============================================================================
-- SLP (Site Layout Plan) DATA
-- ============================================================================

-- Insert SLP areas (logical groupings for the interactive maps)
INSERT INTO slp_areas (id, site_id, name, description, created_at, updated_at)
VALUES 
  ('fty02-slp-admin', 'fty02-test-site', 'Administrative Area', 'Admin offices, conference rooms, and support areas', NOW(), NOW()),
  ('fty02-slp-datacenter', 'fty02-test-site', 'Data Center Floor', 'Main server colocation areas and equipment rooms', NOW(), NOW()),
  ('fty02-slp-infrastructure', 'fty02-test-site', 'Infrastructure', 'Power, cooling, and network infrastructure areas', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert SLP pages (individual plan sheets/drawings)
INSERT INTO slp_pages (id, slp_area_id, page_number, title, description, image_url, image_width, image_height, created_at, updated_at)
VALUES 
  ('fty02-page-01-2', 'fty02-slp-admin', 1, 'FTY02-A-S-01-2', 'Administrative area floor plan - Sheet 2', '/test_data/extraction_results/FTY02-A-S-01-2_page_1.png', 3300, 2550, NOW(), NOW()),
  ('fty02-page-01-6', 'fty02-slp-datacenter', 1, 'FTY02-A-S-01-6', 'Data center floor plan - Sheet 6', '/test_data/extraction_results/FTY02-A-S-01-6_page_1.png', 3300, 2550, NOW(), NOW()),
  ('fty02-page-01-7', 'fty02-slp-datacenter', 2, 'FTY02-A-S-01-7', 'Data center floor plan - Sheet 7', '/test_data/extraction_results/FTY02-A-S-01-7_page_1.png', 3300, 2550, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  image_width = EXCLUDED.image_width,
  image_height = EXCLUDED.image_height,
  updated_at = NOW();

-- ============================================================================
-- SIGN DESCRIPTIONS (Sign Types)
-- ============================================================================

-- Insert sign descriptions/types if they don't exist
INSERT INTO sign_descriptions (id, code, title, description, category, created_at, updated_at)
VALUES 
  ('bc-1-0', 'BC-1.0', 'Exit Sign', 'Standard exit signs for building code compliance', 'Building Code', NOW(), NOW()),
  ('bc-1-14', 'BC-1.14', 'Special Exit Sign', 'Special exit sign variant for specific locations', 'Building Code', NOW(), NOW()),
  ('bc-5-1', 'BC-5.1', '1 Hour Fire Barrier', 'One hour fire-rated barrier identification', 'Building Code', NOW(), NOW()),
  ('bc-5-2', 'BC-5.2', '2 Hour Fire Barrier', 'Two hour fire-rated barrier identification', 'Building Code', NOW(), NOW()),
  ('bc-6-1', 'BC-6.1', 'Equipment Identification', 'Equipment identification and labeling', 'Building Code', NOW(), NOW()),
  ('pac-1-1', 'PAC-1.1', 'Project Marker', 'Project-specific marker signs', 'Project Specific', NOW(), NOW()),
  ('bid-1-2', 'BID-1.2', 'Bidirectional Sign', 'Two-way directional signage', 'Directional', NOW(), NOW()),
  ('id-5-2', 'ID-5.2', 'Room Identification', 'Room and area identification signs', 'Identification', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- ============================================================================
-- PROJECT SIGN CATALOG
-- ============================================================================

-- Function to get sign description ID from code
CREATE OR REPLACE FUNCTION get_sign_description_id(sign_code TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE 
    WHEN sign_code ILIKE 'BC-1.0%' THEN RETURN 'bc-1-0';
    WHEN sign_code ILIKE 'BC-1.14%' THEN RETURN 'bc-1-14';
    WHEN sign_code ILIKE 'BC-5.1%' THEN RETURN 'bc-5-1';
    WHEN sign_code ILIKE 'BC-5.2%' THEN RETURN 'bc-5-2';
    WHEN sign_code ILIKE 'BC-6.1%' THEN RETURN 'bc-6-1';
    WHEN sign_code ILIKE 'PAC-1.1%' THEN RETURN 'pac-1-1';
    WHEN sign_code ILIKE 'BID-1.2%' THEN RETURN 'bid-1-2';
    WHEN sign_code ILIKE 'ID-5.2%' THEN RETURN 'id-5-2';
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Sample project signs based on common patterns found in architectural drawings
-- These will be used as templates before actual extraction data is available
INSERT INTO project_sign_catalog (id, site_id, sign_number, sign_description_id, side_a_message, side_b_message, original_csv_level_no, quantity, created_at, updated_at)
VALUES 
  -- Sheet 2 signs (Admin area)
  ('fty02-sign-1001', 'fty02-test-site', '1001', 'bc-1-0', 'EXIT', NULL, 'ADMIN', 1, NOW(), NOW()),
  ('fty02-sign-1002', 'fty02-test-site', '1002', 'id-5-2', 'CONFERENCE ROOM A', NULL, 'ADMIN', 1, NOW(), NOW()),
  ('fty02-sign-1003', 'fty02-test-site', '1003', 'bc-6-1', 'FIRE PANEL', NULL, 'ADMIN', 1, NOW(), NOW()),
  
  -- Sheet 6 signs (Data center)
  ('fty02-sign-2001', 'fty02-test-site', '2001', 'pac-1-1', 'COLO 1 ENTRANCE', NULL, 'COLO 1', 1, NOW(), NOW()),
  ('fty02-sign-2002', 'fty02-test-site', '2002', 'bc-5-1', '1 HOUR FIRE BARRIER', NULL, 'COLO 1', 1, NOW(), NOW()),
  ('fty02-sign-2003', 'fty02-test-site', '2003', 'bid-1-2', 'DATA CENTER → ← ADMIN', NULL, 'SITE', 1, NOW(), NOW()),
  
  -- Sheet 7 signs (Data center continued)
  ('fty02-sign-1263', 'fty02-test-site', '1263', 'pac-1-1', 'COLO 2 ROW A', NULL, 'COLO 2', 1, NOW(), NOW()),
  ('fty02-sign-1264', 'fty02-test-site', '1264', 'bc-1-0', 'EXIT', NULL, 'COLO 2', 1, NOW(), NOW()),
  ('fty02-sign-1285', 'fty02-test-site', '1285', 'bc-5-2', '2 HOUR FIRE BARRIER', NULL, 'COLO 2', 1, NOW(), NOW()),
  ('fty02-sign-3001', 'fty02-test-site', '3001', 'id-5-2', 'ELECTRICAL ROOM', NULL, 'SITE', 1, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  sign_description_id = EXCLUDED.sign_description_id,
  side_a_message = EXCLUDED.side_a_message,
  side_b_message = EXCLUDED.side_b_message,
  original_csv_level_no = EXCLUDED.original_csv_level_no,
  quantity = EXCLUDED.quantity,
  updated_at = NOW();

-- ============================================================================
-- HOTSPOTS (Interactive Map Positions)
-- ============================================================================

-- Sample hotspots with realistic positions for testing
-- These positions are estimated based on typical architectural drawing layouts
-- In production, these would come from the PDF extraction process

INSERT INTO hotspots (id, slp_page_id, sign_number, x_percentage, y_percentage, width_percentage, height_percentage, inventory_status, install_status, confidence_score, created_at, updated_at)
VALUES 
  -- FTY02-A-S-01-2 hotspots (Admin area)
  ('hotspot-1001-page-2', 'fty02-page-01-2', '1001', 85.5, 15.2, 3.0, 2.5, 'Not_Inventoried_Yet', 'Pending_Install', 0.95, NOW(), NOW()),
  ('hotspot-1002-page-2', 'fty02-page-01-2', '1002', 25.3, 45.7, 4.2, 2.8, 'Not_Inventoried_Yet', 'Pending_Install', 0.92, NOW(), NOW()),
  ('hotspot-1003-page-2', 'fty02-page-01-2', '1003', 12.8, 78.3, 3.5, 2.2, 'Not_Inventoried_Yet', 'Pending_Install', 0.88, NOW(), NOW()),
  
  -- FTY02-A-S-01-6 hotspots (Data center)
  ('hotspot-2001-page-6', 'fty02-page-01-6', '2001', 45.2, 25.8, 3.8, 2.6, 'Not_Inventoried_Yet', 'Pending_Install', 0.97, NOW(), NOW()),
  ('hotspot-2002-page-6', 'fty02-page-01-6', '2002', 67.5, 55.3, 4.5, 3.2, 'Not_Inventoried_Yet', 'Pending_Install', 0.93, NOW(), NOW()),
  ('hotspot-2003-page-6', 'fty02-page-01-6', '2003', 78.9, 82.1, 5.2, 2.9, 'Not_Inventoried_Yet', 'Pending_Install', 0.91, NOW(), NOW()),
  
  -- FTY02-A-S-01-7 hotspots (Data center continued) - These match the test page example
  ('hotspot-1263-page-7', 'fty02-page-01-7', '1263', 15.5, 22.3, 2.5, 2.5, 'Not_Inventoried_Yet', 'Pending_Install', 0.98, NOW(), NOW()),
  ('hotspot-1264-page-7', 'fty02-page-01-7', '1264', 45.2, 35.7, 3.2, 2.5, 'Not_Inventoried_Yet', 'Pending_Install', 0.95, NOW(), NOW()),
  ('hotspot-1285-page-7', 'fty02-page-01-7', '1285', 78.5, 67.2, 2.5, 2.5, 'Not_Inventoried_Yet', 'Pending_Install', 0.92, NOW(), NOW()),
  ('hotspot-3001-page-7', 'fty02-page-01-7', '3001', 32.8, 58.9, 4.1, 3.0, 'Not_Inventoried_Yet', 'Pending_Install', 0.89, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  x_percentage = EXCLUDED.x_percentage,
  y_percentage = EXCLUDED.y_percentage,
  width_percentage = EXCLUDED.width_percentage,
  height_percentage = EXCLUDED.height_percentage,
  inventory_status = EXCLUDED.inventory_status,
  install_status = EXCLUDED.install_status,
  confidence_score = EXCLUDED.confidence_score,
  updated_at = NOW();

-- ============================================================================
-- UPDATE HOTSPOTS WITH ACTUAL EXTRACTION DATA
-- ============================================================================

-- This section would be populated with actual extraction results
-- The following is a template for updating hotspots with real OCR data

/*
-- Example: Update hotspots with real extraction data
-- This would be generated dynamically based on extraction results JSON

-- Update hotspot 1263 with actual OCR position (example from PDF extraction)
UPDATE hotspots 
SET 
  x_percentage = 15.5,
  y_percentage = 22.3,
  width_percentage = 2.1,
  height_percentage = 1.8,
  confidence_score = 0.98,
  updated_at = NOW()
WHERE id = 'hotspot-1263-page-7';

-- Add newly discovered signs from extraction
INSERT INTO project_sign_catalog (id, site_id, sign_number, sign_description_id, side_a_message, original_csv_level_no, quantity, created_at, updated_at)
VALUES 
  ('fty02-sign-2001-1', 'fty02-test-site', '2001.1', get_sign_description_id('PAC-1.1'), 'COLO 2 ROW A SUBSECTION', 'COLO 2', 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO hotspots (id, slp_page_id, sign_number, x_percentage, y_percentage, width_percentage, height_percentage, inventory_status, install_status, confidence_score, created_at, updated_at)
VALUES 
  ('hotspot-2001-1-page-7', 'fty02-page-01-7', '2001.1', 25.3, 42.8, 2.8, 2.1, 'Not_Inventoried_Yet', 'Pending_Install', 0.94, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count total hotspots created
SELECT 
  sp.title as page_title,
  COUNT(h.id) as hotspot_count,
  AVG(h.confidence_score) as avg_confidence
FROM slp_pages sp
LEFT JOIN hotspots h ON sp.id = h.slp_page_id
WHERE sp.id LIKE 'fty02-page-%'
GROUP BY sp.id, sp.title
ORDER BY sp.page_number;

-- List all hotspots with sign details
SELECT 
  h.id,
  sp.title as page,
  h.sign_number,
  sd.code as sign_type,
  psc.side_a_message,
  h.x_percentage,
  h.y_percentage,
  h.confidence_score
FROM hotspots h
JOIN slp_pages sp ON h.slp_page_id = sp.id
JOIN project_sign_catalog psc ON h.sign_number = psc.sign_number
LEFT JOIN sign_descriptions sd ON psc.sign_description_id = sd.id
WHERE sp.id LIKE 'fty02-page-%'
ORDER BY sp.page_number, h.x_percentage;

-- Summary statistics
SELECT 
  COUNT(DISTINCT sp.id) as total_pages,
  COUNT(h.id) as total_hotspots,
  COUNT(DISTINCT psc.sign_description_id) as unique_sign_types,
  AVG(h.confidence_score) as overall_avg_confidence
FROM slp_pages sp
LEFT JOIN hotspots h ON sp.id = h.slp_page_id
LEFT JOIN project_sign_catalog psc ON h.sign_number = psc.sign_number
WHERE sp.id LIKE 'fty02-page-%';

-- Clean up helper function
DROP FUNCTION IF EXISTS get_sign_description_id(TEXT);

-- ============================================================================
-- NOTES FOR PRODUCTION USE
-- ============================================================================

/*
Production Workflow:

1. Run PDF extraction script:
   node test_data/extraction_scripts/run-extraction.js

2. Load extraction results and generate specific SQL:
   - Parse all_extraction_results.json
   - Generate INSERT statements for new signs found
   - Generate UPDATE statements for hotspot positions
   - Include confidence scores and metadata

3. Execute this base SQL script first, then apply extraction-specific updates

4. Verify data integrity:
   - Check that all hotspots reference valid slp_pages
   - Ensure all sign_numbers exist in project_sign_catalog
   - Validate percentage coordinates are within 0-100 range
   - Confirm minimum hotspot sizes for touch targets

5. Test in the web interface:
   - Navigate to /plans/test
   - Load each PDF page
   - Verify hotspot positions align with actual signs
   - Test touch interactions on mobile devices

6. Production deployment:
   - Move verified data to production tables
   - Set up proper user permissions
   - Enable Row Level Security (RLS) policies
   - Configure real-time subscriptions if needed
*/