CREATE TABLE IF NOT EXISTS invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invite_codes_status_valid CHECK (status IN ('active', 'disabled', 'revoked')),
  CONSTRAINT invite_codes_code_format CHECK (code ~ '^[A-Z0-9]{12,32}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_codes_code_unique
  ON invite_codes (code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_codes_one_active_per_user
  ON invite_codes (user_id)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS trg_invite_codes_updated_at ON invite_codes;
CREATE TRIGGER trg_invite_codes_updated_at
BEFORE UPDATE ON invite_codes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS invite_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code_id uuid NOT NULL REFERENCES invite_codes(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'qualified',
  qualified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT invite_referrals_distinct_users CHECK (inviter_user_id <> invitee_user_id),
  CONSTRAINT invite_referrals_status_valid CHECK (status IN ('pending', 'qualified', 'rejected', 'revoked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_referrals_invitee_unique
  ON invite_referrals (invitee_user_id);

CREATE INDEX IF NOT EXISTS idx_invite_referrals_inviter_status
  ON invite_referrals (inviter_user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS user_discount_eligibilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  eligibility_type text NOT NULL,
  status text NOT NULL DEFAULT 'locked',
  required_count integer NOT NULL DEFAULT 3,
  current_count integer NOT NULL DEFAULT 0,
  unlocked_at timestamptz,
  reserved_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  consumed_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_discount_eligibilities_status_valid CHECK (status IN ('locked', 'unlocked', 'reserved', 'consumed', 'revoked')),
  CONSTRAINT user_discount_eligibilities_counts_valid CHECK (required_count > 0 AND current_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_discount_eligibilities_user_type
  ON user_discount_eligibilities (user_id, eligibility_type);

DROP TRIGGER IF EXISTS trg_user_discount_eligibilities_updated_at ON user_discount_eligibilities;
CREATE TRIGGER trg_user_discount_eligibilities_updated_at
BEFORE UPDATE ON user_discount_eligibilities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS eligibility_id uuid REFERENCES user_discount_eligibilities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_amount_cents integer,
  ADD COLUMN IF NOT EXISTS discount_type text;

CREATE INDEX IF NOT EXISTS idx_orders_eligibility_id
  ON orders (eligibility_id)
  WHERE eligibility_id IS NOT NULL;
