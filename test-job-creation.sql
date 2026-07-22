-- Test Job Creation Script
-- Run this to test if you can create jobs in the database

-- 1. Test inserting a job without created_by (should work after quick-fix)
SELECT '=== TESTING JOB CREATION ===' as section;

-- First, let's see what crews and customers we have
SELECT 'Available crews:' as info;
SELECT id, name FROM crews;

SELECT 'Available customers:' as info;
SELECT id, name FROM customers;

-- 2. Test job insertion
INSERT INTO jobs (
  customer_id, 
  job_type, 
  day_idx, 
  start, 
  duration_min, 
  crew_id, 
  area, 
  sqft, 
  notes
) 
SELECT 
  (SELECT id FROM customers LIMIT 1),
  'spray_foam',
  0,
  '09:00',
  120,
  (SELECT id FROM crews LIMIT 1),
  'Test Area',
  1000,
  'Test job created by SQL'
RETURNING id, customer_id, crew_id, job_type, start, area;

-- 3. Verify the job was created
SELECT '=== VERIFYING JOB CREATION ===' as section;
SELECT 
  j.id,
  j.job_type,
  j.start,
  j.area,
  j.sqft,
  j.created_by,
  c.name as customer_name,
  cr.name as crew_name
FROM jobs j
LEFT JOIN customers c ON j.customer_id = c.id
LEFT JOIN crews cr ON j.crew_id = cr.id
WHERE j.notes = 'Test job created by SQL';

-- 4. Clean up test data
DELETE FROM jobs WHERE notes = 'Test job created by SQL';

SELECT '=== TEST COMPLETED ===' as section;
SELECT 'Job creation test completed successfully!' as result;
