-- File storage quota of an organization in megabytes. NULL (the default) means the instance-wide default
-- (FILE_QUOTA_ORGANIZATION_MB) applies. Set by billing or an administrator, never by the API.
ALTER TABLE tv_auth.organizations ADD COLUMN IF NOT EXISTS file_quota_mb INTEGER CHECK (file_quota_mb IS NULL OR file_quota_mb >= 0);
