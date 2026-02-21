export type AppResponse<S> = {
    response: S;
    rid: string;
};

export type AppStoreState = {
    drawer: boolean;
};
