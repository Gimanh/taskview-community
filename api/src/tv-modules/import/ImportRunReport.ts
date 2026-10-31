import { getCentrifugoClient } from '../../core/CentrifugoClient';
import { $logger } from '../../modules/logget';
import { ImportRepository } from './ImportRepository';
import {
    IMPORT_PROGRESS_EVENT,
    type ImportJobStats,
    type ImportProgressArgs,
    type ImportRunReportArgs,
    type ImportWarning,
} from './types';

const MAX_WARNINGS = 100;
const PROGRESS_INTERVAL_MS = 1000;

export class ImportRunReport {
    readonly stats: ImportJobStats = {
        tasksCreated: 0,
        statusesCreated: 0,
        listsCreated: 0,
        tagsCreated: 0,
        membersAdded: 0,
        assigneesLinked: 0,
        attachmentsUploaded: 0,
        attachmentsSkipped: 0,
        warnings: [],
        warningsTruncated: false,
    };

    private readonly repository = new ImportRepository();
    private readonly jobId: number;
    private readonly userId: number;
    private lastProgressAt = 0;

    constructor(args: ImportRunReportArgs) {
        this.jobId = args.jobId;
        this.userId = args.userId;
    }

    warn(warning: ImportWarning): void {
        if (this.stats.warnings.length >= MAX_WARNINGS) {
            this.stats.warningsTruncated = true;
            return;
        }
        this.stats.warnings.push(warning);
    }

    async progress(args: ImportProgressArgs): Promise<void> {
        const now = Date.now();
        if (!args.force && now - this.lastProgressAt < PROGRESS_INTERVAL_MS) return;
        this.lastProgressAt = now;

        const progress = { phase: args.phase, done: args.done, total: args.total };
        await this.repository.setProgress({ id: this.jobId, progress });
        try {
            await getCentrifugoClient().publishToUser(this.userId, IMPORT_PROGRESS_EVENT, { jobId: this.jobId, progress });
        } catch (err) {
            $logger.warn(`[Import] progress publish failed job=${this.jobId}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}
