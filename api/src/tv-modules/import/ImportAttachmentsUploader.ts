import { $logger } from '../../modules/logget';
import type { ImportAttachmentsUploaderArgs, ImportPendingAttachment, ImportUploadAttachmentArgs, ImportWarningCode } from './types';

export class ImportAttachmentsUploader {
    private readonly args: ImportAttachmentsUploaderArgs;

    constructor(args: ImportAttachmentsUploaderArgs) {
        this.args = args;
    }

    async upload(pending: ImportPendingAttachment[]): Promise<void> {
        if (pending.length === 0) return;
        const { actor, report } = this.args;

        const storage = actor.filesManager.status();
        if (!storage.enabled) {
            report.warn({ code: 'attachment_storage_disabled', subject: null });
            report.stats.attachmentsSkipped += pending.length;
            return;
        }

        await report.progress({ phase: 'attachments', done: 0, total: pending.length, force: true });
        for (const [index, item] of pending.entries()) {
            await this.args.ensureActive();

            const warning = await this.uploadOne({ item, maxBytes: storage.maxFileSizeBytes });
            if (warning) {
                report.warn({ code: warning, subject: item.attachment.name });
                report.stats.attachmentsSkipped++;
            } else {
                report.stats.attachmentsUploaded++;
            }
            await report.progress({ phase: 'attachments', done: index + 1, total: pending.length });
        }
    }

    private async uploadOne(args: ImportUploadAttachmentArgs): Promise<ImportWarningCode | null> {
        const { attachment, taskId } = args.item;
        if (attachment.sizeBytes !== null && attachment.sizeBytes > args.maxBytes) return 'attachment_too_large';

        const user = this.args.actor.getUserData()!;
        try {
            const download = await this.args.reader.downloadAttachment(attachment);
            const result = await this.args.actor.filesManager.upload({
                goalId: this.args.goalId,
                uploaderId: user.id,
                uploaderEmail: user.email,
                taskId,
                originalName: attachment.name,
                mimeType: download.mimeType,
                stream: download.stream,
            });
            if (result.ok) return null;
            if (result.code === 'too_large') return 'attachment_too_large';
            if (result.code === 'quota_exceeded') return 'attachment_quota_exceeded';
            if (result.code === 'storage_not_configured') return 'attachment_storage_disabled';
            return 'attachment_failed';
        } catch (err) {
            $logger.warn(`[Import] attachment failed goal=${this.args.goalId}: ${err instanceof Error ? err.message : String(err)}`);
            return 'attachment_failed';
        }
    }
}
