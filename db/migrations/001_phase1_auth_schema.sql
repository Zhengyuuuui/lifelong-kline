CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  CREATE TYPE auth_provider AS ENUM ('apple', 'wechat', 'phone', 'email', 'guest');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'disabled', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE gender_type AS ENUM ('male', 'female', 'neutral');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE ai_feature_type AS ENUM (
    'bazi_report',
    'life_book',
    'life_kline',
    'smooth_sailing',
    'valuation',
    'revenue_forecast',
    'chat'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'success', 'failed', 'refunded', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE membership_status AS ENUM ('inactive', 'active', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_provider auth_provider NOT NULL,
  openid text,
  unionid text,
  apple_sub text,
  display_name text,
  email citext,
  phone text,
  avatar_url text,
  status user_status NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT users_provider_identity_required CHECK (
    (auth_provider = 'apple' AND apple_sub IS NOT NULL)
    OR (auth_provider = 'wechat' AND openid IS NOT NULL)
    OR auth_provider IN ('phone', 'email', 'guest')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_sub_unique
  ON users (apple_sub)
  WHERE apple_sub IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wechat_openid_unique
  ON users (openid)
  WHERE openid IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wechat_unionid_unique
  ON users (unionid)
  WHERE unionid IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
  ON users (email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_status_created_at
  ON users (status, created_at DESC);

CREATE TABLE IF NOT EXISTS user_auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider auth_provider NOT NULL,
  provider_subject text NOT NULL,
  openid text,
  unionid text,
  apple_sub text,
  email citext,
  raw_claims jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_user_auth_identities_user_id
  ON user_auth_identities (user_id);

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  gender gender_type NOT NULL,
  birth_date date NOT NULL,
  birth_time time,
  birth_place text,
  derived_ai_foundation jsonb NOT NULL DEFAULT '{}'::jsonb,
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_name_length CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT user_profiles_birth_date_valid CHECK (
    birth_date >= DATE '1900-01-01'
    AND birth_date <= CURRENT_DATE
  )
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_birth_date
  ON user_profiles (birth_date);

CREATE TABLE IF NOT EXISTS ai_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature ai_feature_type NOT NULL,
  model text NOT NULL,
  prompt_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt_hash text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  status_code integer,
  latency_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_history_user_created_at
  ON ai_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_history_feature_created_at
  ON ai_history (feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_history_prompt_hash
  ON ai_history (prompt_hash);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id text,
  product_id text NOT NULL,
  payment_provider text NOT NULL DEFAULT 'apple_iap',
  payment_status order_status NOT NULL DEFAULT 'pending',
  purchase_token text,
  environment text NOT NULL DEFAULT 'sandbox',
  amount_cents integer,
  currency text NOT NULL DEFAULT 'CNY',
  raw_receipt jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  failed_at timestamptz,
  CONSTRAINT orders_amount_non_negative CHECK (amount_cents IS NULL OR amount_cents >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_transaction_id_unique
  ON orders (transaction_id)
  WHERE transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_created_at
  ON orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
  ON orders (payment_status, created_at DESC);

CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  product_id text NOT NULL,
  status membership_status NOT NULL DEFAULT 'active',
  entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_status
  ON memberships (user_id, status, started_at DESC);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  family_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_agent text,
  ip_address inet,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_token_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id
  ON refresh_tokens (family_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_user_created_at
  ON audit_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_type_created_at
  ON audit_events (event_type, created_at DESC);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_auth_identities_updated_at ON user_auth_identities;
CREATE TRIGGER trg_user_auth_identities_updated_at
BEFORE UPDATE ON user_auth_identities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_memberships_updated_at ON memberships;
CREATE TRIGGER trg_memberships_updated_at
BEFORE UPDATE ON memberships
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
