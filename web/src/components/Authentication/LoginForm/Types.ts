type ResponseData = {
    refresh: string;
    access: string;
    type: string;
    userData: {
        login: string;
        email: string;
        permissions: {
            [key: string]: true;
        };
    };
};
export type LoginResponse = ResponseData;

export type LogoutResponse = { logout: boolean };
