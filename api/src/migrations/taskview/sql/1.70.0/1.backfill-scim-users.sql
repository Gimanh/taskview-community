-- Identity providers connected before 1.70.0 know their users by email (the old SCIM id).
-- Keep those ids so existing provisioning keeps working. Only addresses of the SSO domain:
-- SCIM must never manage members outside it.
INSERT INTO tv_auth.scim_users (sso_config_id, scim_id, user_name, email, member_email)
SELECT c.id, m.email, lower(m.email), lower(m.email), m.email
FROM tv_auth.sso_configs c
JOIN tv_auth.organization_members m ON m.organization_id = c.organization_id
WHERE c.scim_token IS NOT NULL
  AND lower(split_part(m.email, '@', 2)) = lower(c.email_domain_restriction)
ON CONFLICT DO NOTHING;
