/**
 * E2E auth fixtures. TEST_USER matches the DB seed from community migrations
 * (user / user1!#Q from app_permissions.sql); the INBOX_* accounts come from
 * fixtures/seed-users.sql, applied by docker-setup.sh.
 */
export const TEST_USER = {
  login: 'user',
  password: 'user1!#Q',
}

export const INBOX_OWNER = {
  login: 'inbox_owner',
  password: 'user1!#Q',
}

export const INBOX_COLLEAGUE = {
  login: 'inbox_colleague',
  password: 'user1!#Q',
}
