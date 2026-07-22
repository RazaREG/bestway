-- Run in Supabase SQL editor: stock deduct multiplier per inventory item (default 1 = 1:1).
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS deduct_ratio numeric(10, 4) NOT NULL DEFAULT 1;

COMMENT ON COLUMN inventory_items.deduct_ratio IS
  'Stock removed = quantity entered on job × deduct_ratio (e.g. 0.5 removes half a unit per 1 entered).';

UPDATE inventory_items
SET deduct_ratio = 1
WHERE deduct_ratio IS NULL OR deduct_ratio <= 0;
