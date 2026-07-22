-- Fix for Bestway Jobs Database Issues
-- Run these commands in your Supabase SQL editor

-- 1. Fix RLS policies for customers table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all customers" ON customers;
DROP POLICY IF EXISTS "Users can insert customers" ON customers;
DROP POLICY IF EXISTS "Users can update customers" ON customers;
DROP POLICY IF EXISTS "Users can delete customers" ON customers;

-- Create comprehensive policies for customers
CREATE POLICY "Users can view all customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Users can insert customers" ON customers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update customers" ON customers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete customers" ON customers FOR DELETE USING (auth.uid() IS NOT NULL);

-- 2. Fix RLS policies for crews table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all crews" ON crews;
DROP POLICY IF EXISTS "Users can insert crews" ON crews;
DROP POLICY IF EXISTS "Users can update crews" ON crews;
DROP POLICY IF EXISTS "Users can delete crews" ON crews;

-- Create comprehensive policies for crews
CREATE POLICY "Users can view all crews" ON crews FOR SELECT USING (true);
CREATE POLICY "Users can insert crews" ON crews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update crews" ON crews FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete crews" ON crews FOR DELETE USING (auth.uid() IS NOT NULL);

-- 3. Fix RLS policies for jobs table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;

-- Create comprehensive policies for jobs
CREATE POLICY "Users can view their own jobs" ON jobs FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert their own jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own jobs" ON jobs FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own jobs" ON jobs FOR DELETE USING (auth.uid() = created_by);

-- 4. Ensure auth.users table has RLS enabled
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- 5. Create a policy for auth.users (if needed)
-- This allows users to read their own user record
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON auth.users FOR SELECT USING (auth.uid() = id);

-- 6. Insert sample data (only if tables are empty)
-- Check if crews table is empty and insert sample data
INSERT INTO crews (name) 
SELECT 'Crew A' WHERE NOT EXISTS (SELECT 1 FROM crews WHERE name = 'Crew A');

INSERT INTO crews (name) 
SELECT 'Crew B' WHERE NOT EXISTS (SELECT 1 FROM crews WHERE name = 'Crew B');

-- Check if customers table is empty and insert sample data
INSERT INTO customers (name, address) 
SELECT 'Singh Residence', '12 Meadow Ln, Brampton' 
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE name = 'Singh Residence');

INSERT INTO customers (name, address) 
SELECT 'Patel Custom Homes', '88 Skyline Dr, Mississauga' 
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE name = 'Patel Custom Homes');

-- 7. Verify the setup
-- This query should return the current user's ID
SELECT auth.uid() as current_user_id;

-- This query should show all crews
SELECT * FROM crews;

-- This query should show all customers
SELECT * FROM customers;
