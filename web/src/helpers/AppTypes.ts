export type RestaurantContacts = {
    email: string;
    phone: string;
    address: string;
    workStart: string;
    workEnd: string;
};

export type RestaurantItem = {
    id: number;
    name: string;
    owner: number;
    date: string;
    currency: string;
    contacts: RestaurantContacts;
    restaurantLogin: string;
};
export type RestaurantItems = RestaurantItem[];

export type UpdateRestaurantInfoResponse = {
    restaurant: RestaurantItem;
    update: boolean;
    updateContacts: boolean;
};
export type AppConfigResponse = {
    response: {
        namespace: string;
        updateBlockedInterval: number;
    };
    rid: string | null;
};

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

export interface VuetifyForm {
    validate(): boolean;
}

// export type AppResponse<S> = {
//     response: S
//     rid: string
// };

export type FormFieldRules = ((v: string) => true | string)[];

export type RegistrationResult = {
    registration: boolean;
    confirmEmail: boolean;
};

export type AppCredentialsFormTabs = { title: string; component: string; recovery: boolean }[];

export type RecoveryRequestResponse = { sent: boolean };

export type ResetPasswordResponse = { reset: boolean };

export type AppLanguages = { id: string; title: string }[];

export type AppVersionsData = { [key: string]: { date: string; description: string; items: string[] } };

export type VuetifyHeaderItem = { text: string; value: string; sortable?: boolean; align?: string };

export type VuetifyHeaderItems = VuetifyHeaderItem[];

export const IMAGE_HEIGHT = 290;
