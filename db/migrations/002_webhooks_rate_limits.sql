ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS original_transaction_id text,
  ADD COLUMN IF NOT EXISTS provider_payload_hash text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_original_transaction_id
  ON orders (original_transaction_id)
  WHERE original_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_provider_payload_hash
  ON orders (provider_payload_hash)
  WHERE provider_payload_hash IS NOT NULL;

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS original_transaction_id text,
  ADD COLUMN IF NOT EXISTS current_transaction_id text;

CREATE INDEX IF NOT EXISTS idx_memberships_original_transaction_id
  ON memberships (original_transaction_id)
  WHERE original_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS app_store_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_uuid text NOT NULL UNIQUE,
  notification_type text NOT NULL,
  subtype text,
  environment text NOT NULL,
  transaction_id text,
  original_transaction_id text,
  product_id text,
  signed_date timestamptz,
  processing_status text NOT NULL DEFAULT 'received',
  payload_hash text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_app_store_notifications_transaction
  ON app_store_notifications (transaction_id, original_transaction_id);

CREATE INDEX IF NOT EXISTS idx_app_store_notifications_type_created
  ON app_store_notifications (notification_type, created_at DESC);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL,
  route_key text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket_key, route_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_updated_at
  ON api_rate_limits (updated_at DESC);

DROP TRIGGER IF EXISTS trg_api_rate_limits_updated_at ON api_rate_limits;
CREATE TRIGGER trg_api_rate_limits_updated_at
BEFORE UPDATE ON api_rate_limits
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
