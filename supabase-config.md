# Supabase Configuration

To make this app fully functional, you need to set up Supabase:

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

## 2. Environment Variables

Create a `.env` file in the root directory with:

```
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 3. Database Schema

Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create crews table
CREATE TABLE crews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create jobs table
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

-- Enable RLS on all tables
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all crews" ON crews FOR SELECT USING (true);
CREATE POLICY "Users can view all customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Users can view their own jobs" ON jobs FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert their own jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own jobs" ON jobs FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own jobs" ON jobs FOR DELETE USING (auth.uid() = created_by);

-- Insert sample data
INSERT INTO crews (name) VALUES 
  ('Crew A'),
  ('Crew B');

INSERT INTO customers (name, address) VALUES 
  ('Singh Residence', '12 Meadow Ln, Brampton'),
  ('Patel Custom Homes', '88 Skyline Dr, Mississauga');
```

## 4. Authentication Setup

In your Supabase dashboard:

1. Go to Authentication > Settings
2. Add these URLs to "Redirect URLs":
   - `http://localhost:5173`
   - `http://localhost:5174`
   - Your production domain (when you deploy)

## 5. Test the App

1. Start the development server: `npm run dev`
2. Go to `http://localhost:5174`
3. You should be redirected to the login page
4. Enter your email to receive a magic link
5. Click the link in your email to sign in
