-- Alternative fix for foreign key constraint issue
-- Run these commands in your Supabase SQL editor

-- Option 1: Temporarily disable the foreign key constraint
-- This allows the app to work while we debug the user authentication

-- First, let's check if the constraint exists and drop it
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_created_by_fkey;

-- Recreate the constraint but make it deferrable
ALTER TABLE jobs ADD CONSTRAINT jobs_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Option 2: If the above doesn't work, we can temporarily remove the constraint entirely
-- and add it back later when the user authentication is working properly

-- Uncomment the lines below if Option 1 doesn't work:
-- ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_created_by_fkey;

-- Option 3: Create a test to verify user authentication
-- Run this query to see if you can get the current user ID
SELECT auth.uid() as current_user_id;

-- Option 4: Check if there are any users in the auth.users table
-- (This might not work due to RLS, but worth trying)
SELECT id, email, created_at FROM auth.users LIMIT 5;

-- Option 5: Insert a test job without the created_by field to see if other constraints work
-- (Uncomment to test)
-- INSERT INTO jobs (customer_id, job_type, day_idx, start, duration_min, crew_id, area, sqft, notes)
-- SELECT 
--   (SELECT id FROM customers LIMIT 1),
--   'spray_foam',
--   0,
--   '09:00',
--   120,
--   (SELECT id FROM crews LIMIT 1),
--   'Test Area',
--   1000,
--   'Test job'
-- WHERE EXISTS (SELECT 1 FROM customers) AND EXISTS (SELECT 1 FROM crews);

-- Clean up test data
-- DELETE FROM jobs WHERE notes = 'Test job';
