import { config } from 'dotenv';
import type { FileStorageProvider } from 'taskview-db-schemas';
import { FilesRepository } from '../tv-modules/files/FilesRepository';
import { FileStorageFactory } from '../tv-modules/files/storage/FileStorageFactory';
import { FileStorageMigrator } from '../tv-modules/files/storage/FileStorageMigrator';

config({ override: true });

class FilesMigrateStorageCommand {
    private readonly from: FileStorageProvider;
    private readonly to: FileStorageProvider;
    private readonly goalId: number | null;

    constructor(argv: string[]) {
        this.from = this.readArg(argv, '--from');
        this.to = this.readArg(argv, '--to');
        this.goalId = this.readOptionalNumber(argv, '--goal');
        if (this.from === this.to) throw new Error('--from and --to must differ');
    }

    async run(): Promise<void> {
        const factory = FileStorageFactory.getInstance();
        for (const provider of [this.from, this.to]) {
            if (!factory.has(provider)) throw new Error(`Provider "${provider}" is not configured in the environment`);
        }

        const migrator = new FileStorageMigrator({
            source: factory.get(this.from),
            target: factory.get(this.to),
            repository: new FilesRepository(),
            goalId: this.goalId,
        });

        console.log(`Migrating files: ${this.from} -> ${this.to}${this.goalId ? ` (project ${this.goalId})` : ''}`);
        const report = await migrator.run();
        console.log(`migrated: ${report.migrated}`);
        console.log(`skipped: ${report.skipped}`);
        console.log(`cleanup failed: ${report.cleanupFailed}`);
        for (const error of report.errors) console.log(`  ${error.fileId}: ${error.reason}`);
        process.exitCode = report.skipped > 0 ? 1 : 0;
    }

    private readOptionalNumber(argv: string[], name: string): number | null {
        const index = argv.indexOf(name);
        if (index < 0) return null;
        const value = Number(argv[index + 1]);
        if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive project id`);
        return value;
    }

    private readArg(argv: string[], name: string): FileStorageProvider {
        const index = argv.indexOf(name);
        const value = index >= 0 ? argv[index + 1] : undefined;
        if (value !== 'local' && value !== 's3') throw new Error(`${name} must be "local" or "s3"`);
        return value;
    }
}

let command: FilesMigrateStorageCommand;
try {
    command = new FilesMigrateStorageCommand(process.argv.slice(2));
} catch (err) {
    console.error((err as Error).message);
    console.error('Usage: files:migrate --from <local|s3> --to <local|s3> [--goal <projectId>]');
    process.exit(1);
}

command
    .run()
    .catch((err) => {
        console.error((err as Error).message ?? err);
        process.exitCode = 1;
    })
    .finally(() => process.exit());
