ALTER TABLE user_auth_identities
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS bound_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

UPDATE user_auth_identities
SET
  verified_at = COALESCE(verified_at, created_at),
  last_used_at = COALESCE(last_used_at, updated_at, created_at),
  bound_at = COALESCE(bound_at, created_at),
  status = CASE WHEN revoked_at IS NULL THEN 'active' ELSE 'revoked' END;

-- Backfill historical provider identities before login becomes identity-table only.
INSERT INTO user_auth_identities (
  user_id, provider, provider_subject, apple_sub, verified_at, last_used_at, bound_at
)
SELECT id, 'apple'::auth_provider, apple_sub, apple_sub, created_at, last_login_at, created_at
FROM users
WHERE deleted_at IS NULL AND apple_sub IS NOT NULL
ON CONFLICT (provider, provider_subject) DO NOTHING;

INSERT INTO user_auth_identities (
  user_id, provider, provider_subject, openid, unionid, verified_at, last_used_at, bound_at
)
SELECT id, 'wechat'::auth_provider, openid, openid, unionid, created_at, last_login_at, created_at
FROM users
WHERE deleted_at IS NULL AND openid IS NOT NULL
ON CONFLICT (provider, provider_subject) DO NOTHING;

INSERT INTO user_auth_identities (
  user_id, provider, provider_subject, email, verified_at, last_used_at, bound_at
)
SELECT id, 'email'::auth_provider, email::text, email, created_at, last_login_at, created_at
FROM users
WHERE deleted_at IS NULL AND email IS NOT NULL
ON CONFLICT (provider, provider_subject) DO NOTHING;

-- A duplicated legacy phone is deliberately not auto-merged or assigned.
INSERT INTO user_auth_identities (
  user_id, provider, provider_subject, verified_at, last_used_at, bound_at
)
SELECT u.id, 'phone'::auth_provider, u.phone, u.created_at, u.last_login_at, u.created_at
FROM users u
WHERE u.deleted_at IS NULL
  AND u.phone IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM users other
    WHERE other.id <> u.id
      AND other.deleted_at IS NULL
      AND other.phone = u.phone
  )
ON CONFLICT (provider, provider_subject) DO NOTHING;

INSERT INTO user_auth_identities (
  user_id, provider, provider_subject, verified_at, last_used_at, bound_at
)
SELECT id, 'guest'::auth_provider, id::text, created_at, last_login_at, created_at
FROM users
WHERE deleted_at IS NULL AND auth_provider = 'guest'
ON CONFLICT (provider, provider_subject) DO NOTHING;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY user_id ORDER BY bound_at, created_at, id) AS position
  FROM user_auth_identities
  WHERE status = 'active' AND revoked_at IS NULL
)
UPDATE user_auth_identities identity
SET is_primary = ranked.position = 1
FROM ranked
WHERE identity.id = ranked.id;

DO $$
BEGIN
  ALTER TABLE user_auth_identities
    ADD CONSTRAINT user_auth_identities_status_valid
    CHECK (status IN ('active', 'revoked'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE user_auth_identities
    ADD CONSTRAINT user_auth_identities_active_verified
    CHECK (status <> 'active' OR (verified_at IS NOT NULL AND revoked_at IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_auth_identities_one_primary
  ON user_auth_identities (user_id)
  WHERE is_primary = true AND status = 'active' AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_auth_identities_active_user
  ON user_auth_identities (user_id, bound_at)
  WHERE status = 'active' AND revoked_at IS NULL;
