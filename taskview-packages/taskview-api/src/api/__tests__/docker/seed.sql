-- Test users for integration tests
-- Password for both: user1!#Q
INSERT INTO tv_auth.users (login, email, password, block)
VALUES
  ('user', 'user@test.com', '$2a$10$oGfwSbhvI.8I.RfW5oUayOUk61O50aGy5xzMC56UMEWDr.E0o09NK', 0),
  ('user2', 'user2@test.com', '$2a$10$oGfwSbhvI.8I.RfW5oUayOUk61O50aGy5xzMC56UMEWDr.E0o09NK', 0)
ON CONFLICT DO NOTHING;
