ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS merchant_order_no text,
  ADD COLUMN IF NOT EXISTS provider_trade_no text,
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS notify_received_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_merchant_order_no_unique
  ON orders (merchant_order_no)
  WHERE merchant_order_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_provider_trade_no
  ON orders (provider_trade_no)
  WHERE provider_trade_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_notify_received_at
  ON orders (notify_received_at DESC)
  WHERE notify_received_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_provider text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  merchant_order_no text,
  provider_trade_no text,
  provider_order_id text,
  provider_status text,
  payload_hash text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature_valid boolean NOT NULL DEFAULT false,
  processing_status text NOT NULL DEFAULT 'received',
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payment_callbacks_order_id
  ON payment_callbacks (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_callbacks_merchant_order_no
  ON payment_callbacks (merchant_order_no, received_at DESC)
  WHERE merchant_order_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_callbacks_provider_status
  ON payment_callbacks (payment_provider, provider_status, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_callbacks_payload_hash
  ON payment_callbacks (payload_hash);
