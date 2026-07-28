ALTER TABLE tasks.integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;
ALTER TABLE tasks.integrations ADD CONSTRAINT integrations_provider_check CHECK (provider IN ('github', 'gitlab', 'gitea'));
