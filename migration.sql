-- Complete Migration Script for Bestway Jobs
-- Run this in your Supabase SQL Editor to set up the entire database

-- 1. Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS crews CASCADE;

-- 2. Create crews table
CREATE TABLE crews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create customers table
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create jobs table with proper foreign key constraints
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('spray_foam', 'blow_in', 'batts')),
  day_idx INTEGER NOT NULL CHECK (day_idx >= 0 AND day_idx <= 6),
  start TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
  area TEXT,
  sqft INTEGER,
  thickness_in DECIMAL,
  r_value INTEGER,
  product TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Row Level Security on all tables
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- 6. Create comprehensive RLS policies

-- Crews policies
CREATE POLICY "Users can view all crews" ON crews FOR SELECT USING (true);
CREATE POLICY "Users can insert crews" ON crews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update crews" ON crews FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete crews" ON crews FOR DELETE USING (auth.uid() IS NOT NULL);

-- Customers policies
CREATE POLICY "Users can view all customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Users can insert customers" ON customers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update customers" ON customers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete customers" ON customers FOR DELETE USING (auth.uid() IS NOT NULL);

-- Jobs policies
CREATE POLICY "Users can view their own jobs" ON jobs FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert their own jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own jobs" ON jobs FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own jobs" ON jobs FOR DELETE USING (auth.uid() = created_by);

-- 7. Insert sample data
INSERT INTO crews (name) VALUES 
  ('Crew A'),
  ('Crew B');

INSERT INTO customers (name, address) VALUES 
  ('Singh Residence', '12 Meadow Ln, Brampton'),
  ('Patel Custom Homes', '88 Skyline Dr, Mississauga');

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_day_idx ON jobs(day_idx);
CREATE INDEX IF NOT EXISTS idx_jobs_crew_id ON jobs(crew_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);

-- 9. Verify the setup
SELECT 'Migration completed successfully!' as status;

-- 10. Test queries
SELECT 'Crews:' as table_name, count(*) as count FROM crews
UNION ALL
SELECT 'Customers:', count(*) FROM customers
UNION ALL
SELECT 'Jobs:', count(*) FROM jobs;

-- 11. Show current user (if authenticated)
SELECT auth.uid() as current_user_id;
