-- Adds contact and address fields required for postcode-based user codes.
-- Run this against your database before deploying the registration changes.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS locality VARCHAR(120),
    ADD COLUMN IF NOT EXISTS city VARCHAR(120),
    ADD COLUMN IF NOT EXISTS postcode VARCHAR(12),
    ADD COLUMN IF NOT EXISTS user_code VARCHAR(16);

-- Ensure user_code values are unique once populated.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_user_code ON users (user_code);
