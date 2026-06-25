CREATE TABLE IF NOT EXISTS password_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  algorithm text NOT NULL DEFAULT 'argon2id',
  algorithm_version integer NOT NULL DEFAULT 1,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT password_credentials_algorithm_valid CHECK (algorithm = 'argon2id'),
  CONSTRAINT password_credentials_version_valid CHECK (algorithm_version >= 1),
  CONSTRAINT password_credentials_failed_attempts_valid CHECK (failed_attempts >= 0),
  CONSTRAINT password_credentials_hash_present CHECK (char_length(password_hash) >= 20)
);

CREATE INDEX IF NOT EXISTS idx_password_credentials_locked_until
  ON password_credentials (locked_until)
  WHERE locked_until IS NOT NULL;

DROP TRIGGER IF EXISTS trg_password_credentials_updated_at ON password_credentials;
CREATE TRIGGER trg_password_credentials_updated_at
BEFORE UPDATE ON password_credentials
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
