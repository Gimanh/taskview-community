// Configuration constants for the messaging module. Endpoints are env-overridable
// (a mock server in tests, or an enterprise proxy), defaulting to the public provider
// URLs. The Slack Web API methods all derive from one base.

const SLACK_API_BASE = process.env.SLACK_API_BASE_URL || 'https://slack.com/api';

export const SLACK_AUTHORIZE_URL = process.env.SLACK_AUTHORIZE_URL || 'https://slack.com/oauth/v2/authorize';
export const SLACK_WEBHOOK_PREFIX = process.env.SLACK_WEBHOOK_PREFIX || 'https://hooks.slack.com/';
export const SLACK_TOKEN_URL = `${SLACK_API_BASE}/oauth.v2.access`;
export const SLACK_POST_MESSAGE_URL = `${SLACK_API_BASE}/chat.postMessage`;
export const SLACK_UPDATE_MESSAGE_URL = `${SLACK_API_BASE}/chat.update`;
export const SLACK_VIEWS_OPEN_URL = `${SLACK_API_BASE}/views.open`;

export const SLACK_OAUTH_NONCE_COOKIE = 'msg_slack_oauth_nonce';
export const OAUTH_STATE_TTL = '10m';
export const OAUTH_NONCE_MAX_AGE_MS = 10 * 60 * 1000;

export const TELEGRAM_API = 'https://api.telegram.org';

// Lifetime of a deep-link binding token (connect-link flow).
export const LINK_TTL_MS = 15 * 60 * 1000;
