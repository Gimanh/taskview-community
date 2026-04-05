-- Organizations
CREATE TABLE IF NOT EXISTS tv_auth.organizations (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR NOT NULL,
    slug VARCHAR NOT NULL UNIQUE,
    owner_id INTEGER NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
    logo_url VARCHAR,
    is_personal INTEGER NOT NULL DEFAULT 0,
    plan VARCHAR NOT NULL DEFAULT 'free',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON tv_auth.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON tv_auth.organizations(slug);

-- Organization members (by email, not user_id)
CREATE TABLE IF NOT EXISTS tv_auth.organization_members (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    organization_id INTEGER NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
    email VARCHAR NOT NULL,
    role VARCHAR NOT NULL DEFAULT 'member',
    invited_by INTEGER REFERENCES tv_auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_members_organization_id ON tv_auth.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_email ON tv_auth.organization_members(email);

-- Add organization_id to goals (nullable for migration, will be set NOT NULL after data migration)
ALTER TABLE tasks.goals ADD COLUMN IF NOT EXISTS organization_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'goals_organization_id_fkey'
          AND table_schema = 'tasks'
          AND table_name = 'goals'
    ) THEN
        ALTER TABLE tasks.goals
        ADD CONSTRAINT goals_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES tv_auth.organizations(id)
        ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_goals_organization_id ON tasks.goals(organization_id);
