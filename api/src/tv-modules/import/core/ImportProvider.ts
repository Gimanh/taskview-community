import type {
    ImportOptionField,
    ImportProjectMeta,
    ImportProviderAuth,
    ImportProviderCredentialsArgs,
    ImportProviderOptions,
    ImportProviderProjectArgs,
    ImportProviderReaderArgs,
    ImportProviderSanitizeResult,
    ImportReader,
    ImportRemoteProject,
    ImportValidationResult,
} from './import-provider.types';

/**
 * An import source. A provider reads the remote system and converts it to
 * TaskView entities according to its own options; it never touches the
 * database. Everything it yields is written by ImportApplier.
 */
export interface ImportProvider {
    readonly id: string;
    readonly options: ImportOptionField[];

    auth(): ImportProviderAuth;

    sanitizeOptions(options: unknown): ImportProviderSanitizeResult;

    defaultOptions(): ImportProviderOptions;

    validateCredentials(args: ImportProviderCredentialsArgs): Promise<ImportValidationResult>;

    listRemoteProjects(args: ImportProviderCredentialsArgs): Promise<ImportRemoteProject[]>;

    fetchProjectMeta(args: ImportProviderProjectArgs): Promise<ImportProjectMeta>;

    createReader(args: ImportProviderReaderArgs): ImportReader;
}
