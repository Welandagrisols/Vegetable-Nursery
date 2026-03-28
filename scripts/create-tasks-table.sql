-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add due_date column to existing tasks table if it doesn't exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date DATE;

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_name VARCHAR(255) NOT NULL,
  task_type VARCHAR(100) NOT NULL DEFAULT 'General',
  description TEXT,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  batch_sku VARCHAR(50),
  labor_cost DECIMAL(10, 2) DEFAULT 0,
  labor_hours DECIMAL(5, 2),
  labor_rate DECIMAL(10, 2),
  consumables_cost DECIMAL(10, 2) DEFAULT 0,
  total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (COALESCE(labor_cost, 0) + COALESCE(consumables_cost, 0)) STORED,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  assigned_to VARCHAR(255),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_consumables table for tracking consumables used in tasks
CREATE TABLE IF NOT EXISTS public.task_consumables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  consumable_sku VARCHAR(50) NOT NULL,
  consumable_name VARCHAR(255) NOT NULL,
  quantity_used DECIMAL(10, 3) NOT NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'Pieces',
  unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (quantity_used * unit_cost) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sale_items table for detailed sale tracking
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- NOTE: permissive policies were removed.
-- Use scripts/fix-nurserypro-critical-9.sql for strict nursery_id + role based policies.

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_batch_sku ON public.tasks(batch_sku);
CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON public.tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_consumables_task_id ON public.task_consumables(task_id);
CREATE INDEX IF NOT EXISTS idx_task_consumables_sku ON public.task_consumables(consumable_sku);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_inventory_id ON public.sale_items(inventory_id);

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add sample task data
INSERT INTO public.tasks (task_name, task_type, description, task_date, due_date, batch_sku, labor_hours, labor_rate, labor_cost, status, assigned_to) VALUES
('Water Indigenous Trees', 'Watering', 'Daily watering of indigenous tree seedlings in section A', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day', 'IND001', 2.0, 15.00, 30.00, 'Completed', 'Farm Worker 1'),
('Fertilize Moringa Batch', 'Fertilizing', 'Apply organic fertilizer to moringa seedlings', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 'ORN002', 1.5, 15.00, 22.50, 'In Progress', 'Farm Worker 2'),
('Prune Baobab Trees', 'Pruning', 'Shape and prune young baobab trees for better growth', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '5 days', 'IND003', 3.0, 20.00, 60.00, 'Planned', 'Senior Gardener')
ON CONFLICT DO NOTHING;