export function isPrivateImportUrlsAllowed(): boolean {
    return process.env.IMPORT_ALLOW_PRIVATE_URLS?.trim().toLowerCase() === 'true';
}

export function validateImportEnvOnStartup(): void {
    const raw = process.env.IMPORT_ALLOW_PRIVATE_URLS;
    if (raw === undefined || raw.trim() === '') return;
    const normalized = raw.trim().toLowerCase();
    if (normalized !== 'true' && normalized !== 'false') {
        throw new Error(`IMPORT_ALLOW_PRIVATE_URLS has unrecognized value "${raw}". Allowed: true, false`);
    }
}
