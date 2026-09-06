export type OAuthConsentRequest = {
    client_id: string;
    redirect_uri: string;
    code_challenge: string;
    code_challenge_method: 'S256';
    /** Empty means "do not narrow" — same semantics as a tvk_ token with no permissions picked. */
    allowedPermissions?: string[];
    allowedGoalIds?: number[];
    state?: string;
    resource?: string;
};

export type OAuthConsentResponse = {
    redirectUrl: string;
};

export type OAuthConnectedApp = {
    grantId: number;
    clientId: string;
    clientName: string;
    allowedPermissions: string[];
    allowedGoalIds: number[];
    createdAt: string | null;
    lastUsedAt: string | null;
};
