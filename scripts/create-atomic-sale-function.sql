-- Create atomic sale transaction function and add inventory constraints
-- This script implements proper server-side atomic transactions for sales

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add CHECK constraint to ensure inventory quantity is never negative
ALTER TABLE public.inventory 
DROP CONSTRAINT IF EXISTS inventory_quantity_check;

ALTER TABLE public.inventory 
ADD CONSTRAINT inventory_quantity_check CHECK (quantity >= 0);

-- Create or replace the atomic sale transaction function
CREATE OR REPLACE FUNCTION record_sale_atomic(
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_sale_date DATE,
  p_customer_id UUID DEFAULT NULL,
  p_customer_name VARCHAR(255) DEFAULT NULL,
  p_customer_contact VARCHAR(100) DEFAULT NULL,
  p_customer_email VARCHAR(255) DEFAULT NULL,
  p_total_amount DECIMAL(10,2)
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale_id UUID;
  v_customer_id UUID;
  v_inventory_item RECORD;
  v_calculated_total DECIMAL(10,2);
  v_result JSON;
BEGIN
  -- Start the transaction (function automatically provides this)
  
  -- Step 1: Lock and validate inventory item with sufficient stock
  SELECT id, plant_name, quantity, price 
  INTO v_inventory_item
  FROM public.inventory 
  WHERE id = p_inventory_id 
    AND quantity >= p_quantity
  FOR UPDATE; -- This locks the row to prevent concurrent modifications
  
  -- Check if inventory item exists and has sufficient stock
  IF NOT FOUND THEN
    -- Check if item exists at all
    IF NOT EXISTS (SELECT 1 FROM public.inventory WHERE id = p_inventory_id) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'ITEM_NOT_FOUND',
        'message', 'Selected inventory item not found'
      );
    ELSE
      -- Item exists but insufficient stock
      SELECT quantity INTO v_inventory_item FROM public.inventory WHERE id = p_inventory_id;
      RETURN json_build_object(
        'success', false,
        'error', 'INSUFFICIENT_STOCK',
        'message', format('Insufficient stock. Available: %s, Requested: %s', 
                         v_inventory_item.quantity, p_quantity),
        'available_quantity', v_inventory_item.quantity
      );
    END IF;
  END IF;
  
  -- Step 2: Validate that the total amount matches expected calculation
  v_calculated_total := v_inventory_item.price * p_quantity;
  IF ABS(p_total_amount - v_calculated_total) > 0.01 THEN -- Allow small rounding differences
    RETURN json_build_object(
      'success', false,
      'error', 'AMOUNT_MISMATCH',
      'message', format('Total amount mismatch. Expected: %s, Provided: %s', 
                       v_calculated_total, p_total_amount)
    );
  END IF;
  
  -- Step 3: Handle customer creation if needed
  v_customer_id := p_customer_id;
  
  IF p_customer_name IS NOT NULL AND p_customer_contact IS NOT NULL THEN
    -- Create new customer
    INSERT INTO public.customers (name, contact, email, created_at)
    VALUES (TRIM(p_customer_name), TRIM(p_customer_contact), 
            CASE WHEN LENGTH(TRIM(COALESCE(p_customer_email, ''))) > 0 
                 THEN TRIM(p_customer_email) 
                 ELSE NULL END,
            NOW())
    RETURNING id INTO v_customer_id;
  END IF;
  
  -- Step 4: Create the sale record
  INSERT INTO public.sales (
    inventory_id, 
    quantity, 
    sale_date, 
    customer_id, 
    total_amount, 
    created_at
  )
  VALUES (
    p_inventory_id,
    p_quantity,
    p_sale_date,
    v_customer_id,
    p_total_amount,
    NOW()
  )
  RETURNING id INTO v_sale_id;
  
  -- Step 5: Create the sale items record
  INSERT INTO public.sale_items (
    sale_id,
    inventory_id,
    quantity,
    price_per_unit,
    total_price,
    created_at
  )
  VALUES (
    v_sale_id,
    p_inventory_id,
    p_quantity,
    v_inventory_item.price,
    p_total_amount,
    NOW()
  );
  
  -- Step 6: CRITICAL - Atomically decrement inventory quantity
  -- This uses WHERE clause to ensure we still have sufficient stock
  UPDATE public.inventory 
  SET quantity = quantity - p_quantity,
      updated_at = NOW()
  WHERE id = p_inventory_id 
    AND quantity >= p_quantity;
  
  -- Verify the update succeeded (should always succeed due to our earlier lock)
  IF NOT FOUND THEN
    -- This should never happen due to our FOR UPDATE lock above
    RAISE EXCEPTION 'CONCURRENT_MODIFICATION: Inventory was modified by another transaction';
  END IF;
  
  -- Step 7: Return success with sale details
  RETURN json_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'customer_id', v_customer_id,
    'inventory_updated', true,
    'remaining_quantity', (v_inventory_item.quantity - p_quantity),
    'message', format('Sale recorded successfully. %s units of %s sold.', 
                     p_quantity, v_inventory_item.plant_name)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Any error will automatically rollback the transaction
    RETURN json_build_object(
      'success', false,
      'error', 'TRANSACTION_FAILED',
      'message', format('Transaction failed: %s', SQLERRM),
      'sqlstate', SQLSTATE
    );
END;
$$;

-- Grant necessary permissions for the function
GRANT EXECUTE ON FUNCTION record_sale_atomic TO authenticated;
REVOKE EXECUTE ON FUNCTION record_sale_atomic FROM anon;

-- Create indexes for better performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON public.inventory(quantity) WHERE quantity > 0;
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);

-- Add comments for documentation
COMMENT ON FUNCTION record_sale_atomic IS 'Atomically records a sale transaction with proper inventory validation and updates. Handles customer creation, inventory decrement, and sale record creation in a single transaction.';