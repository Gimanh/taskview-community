export type ExternalAuthUser = {
    email: string;
    provider: 'google' | 'github' | string;
}

export const ExternalProviderScope: Record<ExternalAuthUser['provider'], string[]> = {
    google: ["email"],
    github: ["user:email"],
}