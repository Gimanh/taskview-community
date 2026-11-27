import type { QueryResult } from 'pg';

export type InitialUserQueryRunner = {
    query: (text: string, params?: unknown[]) => Promise<QueryResult>;
};

export type InitialUserPasswordCheck =
    | { status: 'missing' }
    | { status: 'invalid'; reason: string }
    | { status: 'ok'; password: string };

export type CreateInitialUserArgs = {
    client: InitialUserQueryRunner;
    password: string;
};
