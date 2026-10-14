import type { FilesRepository } from './FilesRepository';
import type { FileQuotaMode, FileQuotaResolverArgs, FileQuotaState } from './types';

const BYTES_PER_MB = 1024 * 1024;

export class FileQuotaResolver {
    private readonly repository: FilesRepository;
    private readonly mode: FileQuotaMode;
    private readonly defaultOrganizationQuotaBytes: number;

    constructor(args: FileQuotaResolverArgs) {
        this.repository = args.repository;
        this.mode = args.mode;
        this.defaultOrganizationQuotaBytes = args.defaultOrganizationQuotaBytes;
    }

    async forGoal(goalId: number): Promise<FileQuotaState> {
        if (this.mode === 'off') return { mode: 'off', quotaBytes: null, usedBytes: null, organizationId: null };

        const organization = await this.repository.quotaOrganizationForGoal(goalId);
        if (!organization) return { mode: this.mode, quotaBytes: null, usedBytes: null, organizationId: null };

        return {
            mode: this.mode,
            organizationId: organization.organizationId,
            quotaBytes: organization.quotaMb !== null ? organization.quotaMb * BYTES_PER_MB : this.defaultOrganizationQuotaBytes,
            usedBytes: await this.repository.usedBytesInOrganization(organization.organizationId),
        };
    }
}
