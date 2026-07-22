-- Run in Supabase SQL Editor: enable multiple roles per user
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS roles jsonb DEFAULT '[]'::jsonb;

-- Backfill from existing single role column
UPDATE app_users
SET roles = CASE
  WHEN role_id IS NOT NULL THEN
    jsonb_build_array(jsonb_build_object('role', role, 'role_id', role_id::text))
  ELSE
    jsonb_build_array(jsonb_build_object('role', role))
END
WHERE (roles IS NULL OR roles = '[]'::jsonb OR jsonb_array_length(roles) = 0)
  AND role IS NOT NULL;
