export type JWTPayload = {
    exp: number;
    id: number;
    type: 'jwt';
    userData: {
        email: string;
        id: number;
        login: string;
        permissions: {
            [key: string]: {
                id: number;
                name: string;
                description: string;
            };
        };
    };
};

export type RefreshTokenResponse = {
    access: string;
    refresh: string;
};


export type RecoveryRequestResponse = { sent: boolean };

export type ResetPasswordResponse = { reset: boolean };

export type AppLanguages = { id: string; title: string }[];

export type AppVersionsData = { [key: string]: { date: string; description: string; items: string[] } };

export type VuetifyHeaderItem = { text: string; value: string; sortable?: boolean; align?: string };

export type VuetifyHeaderItems = VuetifyHeaderItem[];

export const IMAGE_HEIGHT = 290
