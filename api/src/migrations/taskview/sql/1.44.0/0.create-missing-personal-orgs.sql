-- Create personal organizations for users who don't have any organization membership
-- This covers the default seed user (login: 'user', email: 'test@mail.dest')
-- and any other users who may exist without an organization
INSERT INTO tv_auth.organizations (name, slug, owner_id, is_personal)
SELECT
    u.login || '''s workspace',
    'org-' || substr(md5(random()::text), 1, 8),
    u.id,
    1
FROM tv_auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM tv_auth.organization_members om WHERE om.email = u.email
)
ON CONFLICT DO NOTHING;

-- Add these users as owners of their new personal organizations
INSERT INTO tv_auth.organization_members (organization_id, email, role)
SELECT o.id, u.email, 'owner'
FROM tv_auth.organizations o
JOIN tv_auth.users u ON u.id = o.owner_id
WHERE o.is_personal = 1
ON CONFLICT (organization_id, email) DO NOTHING;
