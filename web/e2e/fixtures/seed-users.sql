-- E2E-only accounts, applied by docker-setup.sh after the migrations. Password: user1!#Q (same as the seed user).
-- Each gets a personal workspace with an Inbox, like a regular sign-up. Safe to run repeatedly.
INSERT INTO tv_auth.users (login, email, password, block, confirm_email_code)
SELECT v.login, v.email, '$2y$10$q8SLauZ0Syz9aEFdiq0i8.jIlafLj5T0ujXYD7RmRzyNkZ2hR7uhO', 0, ''
FROM (VALUES ('inbox_owner', 'inbox-owner@e2e.test'), ('inbox_colleague', 'inbox-colleague@e2e.test')) AS v(login, email)
WHERE NOT EXISTS (SELECT 1 FROM tv_auth.users u WHERE u.email = v.email);

INSERT INTO tv_auth.organizations (name, slug, owner_id, is_personal)
SELECT u.login || '''s workspace', 'e2e-' || replace(u.login, '_', '-'), u.id, 1
FROM tv_auth.users u
WHERE u.email IN ('inbox-owner@e2e.test', 'inbox-colleague@e2e.test')
  AND NOT EXISTS (SELECT 1 FROM tv_auth.organizations o WHERE o.owner_id = u.id AND o.is_personal = 1);

INSERT INTO tv_auth.organization_members (organization_id, email, role)
SELECT o.id, u.email, 'owner'
FROM tv_auth.organizations o
JOIN tv_auth.users u ON u.id = o.owner_id
WHERE o.is_personal = 1 AND u.email IN ('inbox-owner@e2e.test', 'inbox-colleague@e2e.test')
ON CONFLICT (organization_id, email) DO NOTHING;

INSERT INTO tasks.goals (name, owner, organization_id, is_inbox)
SELECT 'Inbox', o.owner_id, o.id, TRUE
FROM tv_auth.organizations o
JOIN tv_auth.users u ON u.id = o.owner_id
WHERE o.is_personal = 1 AND u.email IN ('inbox-owner@e2e.test', 'inbox-colleague@e2e.test')
  AND NOT EXISTS (SELECT 1 FROM tasks.goals g WHERE g.organization_id = o.id AND g.is_inbox);
