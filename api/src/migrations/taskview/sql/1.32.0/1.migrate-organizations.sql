-- Step 1: Create personal organization for each user who owns goals
INSERT INTO tv_auth.organizations (name, slug, owner_id, is_personal)
SELECT
    u.login || '''s workspace',
    'org-' || substr(md5(random()::text), 1, 8),
    u.id,
    1
FROM tv_auth.users u
WHERE EXISTS (SELECT 1 FROM tasks.goals g WHERE g.owner = u.id)
ON CONFLICT DO NOTHING;

-- Step 2: Link goals to their owner's organization
UPDATE tasks.goals g
SET organization_id = o.id
FROM tv_auth.organizations o
WHERE g.owner = o.owner_id
  AND g.organization_id IS NULL;

-- Step 3: Add owner as org member with role 'owner' (by email)
INSERT INTO tv_auth.organization_members (organization_id, email, role)
SELECT o.id, u.email, 'owner'
FROM tv_auth.organizations o
JOIN tv_auth.users u ON u.id = o.owner_id
ON CONFLICT (organization_id, email) DO NOTHING;

-- Step 4: Add existing goal collaborators as org members (by email)
INSERT INTO tv_auth.organization_members (organization_id, email, role)
SELECT DISTINCT g.organization_id, cu.email, 'member'
FROM collaboration.users_to_goals cutg
JOIN collaboration.users cu ON cu.id = cutg.user_id
JOIN tasks.goals g ON g.id = cutg.goal_id
WHERE g.organization_id IS NOT NULL
ON CONFLICT (organization_id, email) DO NOTHING;

-- Step 5: Make organization_id NOT NULL
ALTER TABLE tasks.goals ALTER COLUMN organization_id SET NOT NULL;
