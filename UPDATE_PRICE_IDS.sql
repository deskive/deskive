-- Update tenant_payment_configs to have properly formatted price_ids array
-- Updated with TEST MODE price IDs from Deskive Stripe account

UPDATE tenant_payment_configs
SET price_ids = '["price_1SOyqRFsXZilyyl20p4Ya3vc","price_1SOyqSFsXZilyyl2GGeHdWOr","price_1SOyrhFsXZilyyl2EVrgO0Lp","price_1SOyrhFsXZilyyl2XmfXSRM3","price_1SOys9FsXZilyyl2IJ5WfJnS","price_1SOysdFsXZilyyl2oNEFzGMI"]'::jsonb
WHERE organization_id = 'ad21ded5-6abb-44b3-8622-916330b9a5ed'
  AND project_id = '4a2e3de9-83df-4174-a040-c3a58a918181';

-- Verify the update
SELECT
  id,
  organization_id,
  project_id,
  price_ids,
  jsonb_array_length(price_ids) as num_price_ids
FROM tenant_payment_configs
WHERE organization_id = 'ad21ded5-6abb-44b3-8622-916330b9a5ed'
  AND project_id = '4a2e3de9-83df-4174-a040-c3a58a918181';

-- Expected output:
-- num_price_ids = 6
-- price_ids = [
--   "price_1SOyqRFsXZilyyl20p4Ya3vc",  -- Starter Monthly
--   "price_1SOyqSFsXZilyyl2GGeHdWOr",  -- Starter Yearly
--   "price_1SOyrhFsXZilyyl2EVrgO0Lp",  -- Professional Monthly
--   "price_1SOyrhFsXZilyyl2XmfXSRM3",  -- Professional Yearly
--   "price_1SOys9FsXZilyyl2IJ5WfJnS",  -- Enterprise Monthly
--   "price_1SOysdFsXZilyyl2oNEFzGMI"   -- Enterprise Yearly
-- ]
