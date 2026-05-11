ALTER TABLE tv_auth.organizations
    ADD COLUMN IF NOT EXISTS time_tracking_autostop_hours INTEGER DEFAULT 24;
