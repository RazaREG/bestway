-- Test Script for Bestway Jobs Database
-- Run this after the migration to verify everything is working

-- 1. Check if tables exist
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename IN ('crews', 'customers', 'jobs')
ORDER BY tablename;

-- 2. Check table structures
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('crews', 'customers', 'jobs')
ORDER BY table_name, ordinal_position;

-- 3. Check foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('crews', 'customers', 'jobs');

-- 4. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('crews', 'customers', 'jobs')
ORDER BY tablename, policyname;

-- 5. Test data access
SELECT 'Sample crews:' as info;
SELECT * FROM crews;

SELECT 'Sample customers:' as info;
SELECT * FROM customers;

SELECT 'Sample jobs:' as info;
SELECT * FROM jobs;

-- 6. Test user authentication
SELECT 'Current user ID:' as info, auth.uid() as user_id;

-- 7. Test insert permissions (this should work if user is authenticated)
-- Uncomment the lines below to test insert permissions:
/*
INSERT INTO customers (name, address) 
VALUES ('Test Customer', '123 Test St') 
RETURNING id, name;

-- Clean up test data
DELETE FROM customers WHERE name = 'Test Customer';
*/
