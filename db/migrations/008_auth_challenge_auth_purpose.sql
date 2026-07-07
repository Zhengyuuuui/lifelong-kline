ALTER TABLE auth_challenges
  DROP CONSTRAINT IF EXISTS auth_challenges_purpose_valid;

ALTER TABLE auth_challenges
  ADD CONSTRAINT auth_challenges_purpose_valid
  CHECK (purpose IN ('register', 'auth'));
