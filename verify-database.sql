-- Comprehensive Database Verification Script
-- Run this in your Supabase SQL Editor to check if all changes were applied

-- 1. Check if all tables exist
SELECT '=== TABLE EXISTENCE CHECK ===' as section;
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename IN ('crews', 'customers', 'jobs')
ORDER BY tablename;

-- 2. Check table structures and columns
SELECT '=== TABLE STRUCTURE CHECK ===' as section;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('crews', 'customers', 'jobs')
ORDER BY table_name, ordinal_position;

-- 3. Check foreign key constraints
SELECT '=== FOREIGN KEY CONSTRAINTS CHECK ===' as section;
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('crews', 'customers', 'jobs')
ORDER BY tc.table_name, kcu.column_name;

-- 4. Check RLS (Row Level Security) status
SELECT '=== RLS STATUS CHECK ===' as section;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('crews', 'customers', 'jobs')
ORDER BY tablename;

-- 5. Check RLS policies
SELECT '=== RLS POLICIES CHECK ===' as section;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename IN ('crews', 'customers', 'jobs')
ORDER BY tablename, policyname;

-- 6. Check indexes
SELECT '=== INDEXES CHECK ===' as section;
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('crews', 'customers', 'jobs')
ORDER BY tablename, indexname;

-- 7. Check sample data
SELECT '=== SAMPLE DATA CHECK ===' as section;
SELECT 'Crews:' as table_name, count(*) as record_count FROM crews
UNION ALL
SELECT 'Customers:', count(*) FROM customers
UNION ALL
SELECT 'Jobs:', count(*) FROM jobs;

-- 8. Show actual sample data
SELECT '=== CREWS DATA ===' as section;
SELECT * FROM crews;

SELECT '=== CUSTOMERS DATA ===' as section;
SELECT * FROM customers;

SELECT '=== JOBS DATA ===' as section;
SELECT * FROM jobs;

-- 9. Test user authentication
SELECT '=== USER AUTHENTICATION CHECK ===' as section;
SELECT 
  'Current user ID:' as info, 
  auth.uid() as user_id,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'User is authenticated'
    ELSE 'No user authenticated'
  END as auth_status;

-- 10. Test insert permissions (dry run)
SELECT '=== INSERT PERMISSION TEST ===' as section;
SELECT 
  'Can insert into crews:' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'crews' 
      AND cmd = 'INSERT' 
      AND with_check = 'true'
    ) THEN 'YES - Policy allows all inserts'
    ELSE 'NO - Check policies'
  END as result;

SELECT 
  'Can insert into customers:' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'customers' 
      AND cmd = 'INSERT' 
      AND with_check = 'true'
    ) THEN 'YES - Policy allows all inserts'
    ELSE 'NO - Check policies'
  END as result;

SELECT 
  'Can insert into jobs:' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'jobs' 
      AND cmd = 'INSERT' 
      AND with_check = 'true'
    ) THEN 'YES - Policy allows all inserts'
    ELSE 'NO - Check policies'
  END as result;

-- 11. Check if created_by column is nullable
SELECT '=== CREATED_BY COLUMN CHECK ===' as section;
SELECT 
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'jobs' 
  AND column_name = 'created_by';

-- 12. Final verification summary
SELECT '=== VERIFICATION SUMMARY ===' as section;
SELECT 
  'Tables exist: ' || 
  CASE WHEN (SELECT count(*) FROM pg_tables WHERE tablename IN ('crews', 'customers', 'jobs')) = 3 
    THEN 'YES (3/3)' 
    ELSE 'NO - Missing tables' 
  END as table_check,
  
  'RLS enabled: ' || 
  CASE WHEN (SELECT count(*) FROM pg_tables WHERE tablename IN ('crews', 'customers', 'jobs') AND rowsecurity = true) = 3 
    THEN 'YES (3/3)' 
    ELSE 'NO - RLS not enabled on all tables' 
  END as rls_check,
  
  'Policies exist: ' || 
  CASE WHEN (SELECT count(*) FROM pg_policies WHERE tablename IN ('crews', 'customers', 'jobs')) >= 9 
    THEN 'YES (9+ policies)' 
    ELSE 'NO - Missing policies' 
  END as policy_check,
  
  'Sample data: ' || 
  CASE WHEN (SELECT count(*) FROM crews) >= 2 AND (SELECT count(*) FROM customers) >= 2 
    THEN 'YES (2+ crews, 2+ customers)' 
    ELSE 'NO - Missing sample data' 
  END as data_check;
