CREATE TABLE IF NOT EXISTS auth_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL,
  phone_hash text NOT NULL,
  device_hash text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  consumed_at timestamptz,
  provider_request_id text,
  send_status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_challenges_purpose_valid CHECK (purpose = 'register'),
  CONSTRAINT auth_challenges_hashes_present CHECK (
    char_length(phone_hash) = 64
    AND char_length(device_hash) = 64
    AND char_length(code_hash) = 64
  ),
  CONSTRAINT auth_challenges_attempts_valid CHECK (
    attempt_count >= 0 AND max_attempts BETWEEN 1 AND 20
  ),
  CONSTRAINT auth_challenges_send_status_valid CHECK (
    send_status IN ('pending', 'sent', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_phone_created
  ON auth_challenges (phone_hash, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_device_created
  ON auth_challenges (device_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_expires
  ON auth_challenges (expires_at)
  WHERE consumed_at IS NULL;

DROP TRIGGER IF EXISTS trg_auth_challenges_updated_at ON auth_challenges;
CREATE TRIGGER trg_auth_challenges_updated_at
BEFORE UPDATE ON auth_challenges
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
