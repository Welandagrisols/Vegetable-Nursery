-- Add cost tracking fields to the inventory table
ALTER TABLE IF EXISTS public.inventory 
ADD COLUMN IF NOT EXISTS batch_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_seedling DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS opening_quantity INTEGER;

-- Add comments to explain the new fields
COMMENT ON COLUMN public.inventory.batch_cost IS 'Total cost for the entire batch of seedlings';
COMMENT ON COLUMN public.inventory.cost_per_seedling IS 'Cost per individual seedling (batch_cost / opening_quantity)';
COMMENT ON COLUMN public.inventory.opening_quantity IS 'Original batch quantity at creation time';

-- Create index for cost tracking queries
CREATE INDEX IF NOT EXISTS idx_inventory_cost_per_seedling ON public.inventory(cost_per_seedling);

-- Update existing records to have default values
UPDATE public.inventory 
SET batch_cost = 0,
    opening_quantity = COALESCE(opening_quantity, quantity),
    cost_per_seedling = CASE
      WHEN COALESCE(opening_quantity, quantity) > 0
      THEN COALESCE(batch_cost, 0) / COALESCE(opening_quantity, quantity)
      ELSE 0
    END
WHERE batch_cost IS NULL OR cost_per_seedling IS NULL OR opening_quantity IS NULL;
