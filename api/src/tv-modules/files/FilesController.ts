import busboy from 'busboy';
import { type } from 'arktype';
import type { Request, Response } from 'express';
import type { Readable } from 'node:stream';
import { logError } from '../../utils/api';
import {
    FILE_LIST_DEFAULT_LIMIT,
    FILE_LIST_MAX_LIMIT,
    FileArkTypeContentQuery,
    FileArkTypeDownloadUrl,
    FileArkTypeFileIdParam,
    FileArkTypeGoalIdParam,
    FileArkTypeLink,
    FileArkTypeListQuery,
    FileArkTypeRename,
    FileArkTypeTaskFileParams,
    FileArkTypeTaskIdParam,
    FileArkTypeTokenParam,
    FileArkTypeUploadQuery,
    type FileErrorCode,
    type FileResult,
} from './types';

const codeToStatus: Record<FileErrorCode, number> = {
    not_found: 404,
    forbidden: 403,
    too_large: 413,
    invalid: 400,
    storage_error: 500,
    storage_not_configured: 503,
    quota_exceeded: 507,
};

type IncomingFile = { stream: Readable; filename: string; mimeType: string };

export default class FilesController {
    private sendResult<T>(res: Response, result: FileResult<T>) {
        if (result.ok) return res.tvJson(result.data);
        return res.status(codeToStatus[result.code]).send(result.message ?? result.code);
    }

    status = (req: Request, res: Response) => {
        return res.tvJson(req.appUser.filesManager.status());
    };

    quota = async (req: Request, res: Response) => {
        const params = FileArkTypeGoalIdParam(req.params);
        if (params instanceof type.errors) return res.status(400).send(params.summary);
        return res.tvJson(await req.appUser.filesManager.quotaForGoal(params.goalId));
    };

    upload = async (req: Request, res: Response) => {
        const params = FileArkTypeGoalIdParam(req.params);
        if (params instanceof type.errors) return res.status(400).send(params.summary);
        const query = FileArkTypeUploadQuery(req.query);
        if (query instanceof type.errors) return res.status(400).send(query.summary);

        const user = req.appUser.getUserData();
        if (!user) return res.status(401).end();

        const incoming = await this.readSingleFile(req);
        if (!incoming) return res.status(400).send('file field is required');

        const result = await req.appUser.filesManager.upload({
            goalId: params.goalId,
            uploaderId: user.id,
            uploaderEmail: user.email,
            taskId: query.taskId ?? null,
            originalName: incoming.filename,
            mimeType: incoming.mimeType,
            stream: incoming.stream,
        });
        return this.sendResult(res, result);
    };

    listForGoal = async (req: Request, res: Response) => {
        const data = FileArkTypeListQuery({ ...req.query, ...req.params });
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        const limit = Math.min(Math.max(data.limit ?? FILE_LIST_DEFAULT_LIMIT, 1), FILE_LIST_MAX_LIMIT);
        const page = await req.appUser.filesManager
            .listForGoal({
                goalId: data.goalId,
                search: data.search?.trim() || null,
                type: data.type ?? 'all',
                cursor: data.cursor ?? null,
                limit,
            })
            .catch(logError);
        return res.tvJson(page ?? { items: [], nextCursor: null });
    };

    listForTask = async (req: Request, res: Response) => {
        const data = FileArkTypeTaskIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return res.tvJson((await req.appUser.filesManager.listForTask(data.taskId).catch(logError)) ?? []);
    };

    getOne = async (req: Request, res: Response) => {
        const data = FileArkTypeFileIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        const file = await req.appUser.filesManager.getById(data.fileId).catch(logError);
        if (!file) return res.status(404).end();
        return res.tvJson(file);
    };

    link = async (req: Request, res: Response) => {
        const params = FileArkTypeTaskIdParam(req.params);
        if (params instanceof type.errors) return res.status(400).send(params.summary);
        const body = FileArkTypeLink(req.body);
        if (body instanceof type.errors) return res.status(400).send(body.summary);
        const user = req.appUser.getUserData();
        if (!user) return res.status(401).end();
        return this.sendResult(
            res,
            await req.appUser.filesManager.link({
                taskId: params.taskId,
                fileIds: [...new Set(body.fileIds)],
                linkedById: user.id,
                linkedByEmail: user.email,
            })
        );
    };

    unlink = async (req: Request, res: Response) => {
        const data = FileArkTypeTaskFileParams(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.filesManager.unlink({ taskId: data.taskId, fileId: data.fileId }));
    };

    rename = async (req: Request, res: Response) => {
        const params = FileArkTypeFileIdParam(req.params);
        if (params instanceof type.errors) return res.status(400).send(params.summary);
        const body = FileArkTypeRename(req.body);
        if (body instanceof type.errors) return res.status(400).send(body.summary);
        return this.sendResult(res, await req.appUser.filesManager.rename({ fileId: params.fileId, name: body.name }));
    };

    remove = async (req: Request, res: Response) => {
        const data = FileArkTypeFileIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.filesManager.deleteForever(data.fileId));
    };

    downloadUrl = async (req: Request, res: Response) => {
        const params = FileArkTypeFileIdParam(req.params);
        if (params instanceof type.errors) return res.status(400).send(params.summary);
        const body = FileArkTypeDownloadUrl(req.body ?? {});
        if (body instanceof type.errors) return res.status(400).send(body.summary);
        return this.sendResult(
            res,
            await req.appUser.filesManager.issueDownloadUrl({ fileId: params.fileId, inline: body.inline ?? false })
        );
    };

    content = async (req: Request, res: Response) => {
        const params = FileArkTypeTokenParam(req.params);
        if (params instanceof type.errors) return res.status(400).send(params.summary);
        const query = FileArkTypeContentQuery(req.query);
        if (query instanceof type.errors) return res.status(400).send(query.summary);

        const result = await req.appUser.filesManager.openContent(params.token);
        if (!result.ok) return res.status(codeToStatus[result.code]).send(result.message ?? result.code);

        const { file, stream, sizeBytes, inline } = result.data;
        const disposition = inline || query.inline === '1' ? 'inline' : 'attachment';
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Length', String(sizeBytes));
        res.setHeader('Content-Disposition', this.contentDisposition(disposition, file.name));
        res.setHeader('Cache-Control', 'private, max-age=0, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        stream.on('error', (err) => {
            logError(err);
            if (!res.headersSent) res.status(500).end();
            else res.destroy(err);
        });
        stream.pipe(res);
    };

    private contentDisposition(kind: 'inline' | 'attachment', name: string): string {
        const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
        return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
    }

    private readSingleFile(req: Request): Promise<IncomingFile | null> {
        return new Promise((resolve) => {
            let settled = false;
            const done = (value: IncomingFile | null) => {
                if (settled) return;
                settled = true;
                resolve(value);
            };

            let bb: busboy.Busboy;
            try {
                bb = busboy({ headers: req.headers, limits: { files: 1 }, defParamCharset: 'utf8' });
            } catch {
                return done(null);
            }

            bb.on('file', (_field, stream, info) => {
                done({ stream, filename: info.filename || 'file', mimeType: info.mimeType || 'application/octet-stream' });
            });
            bb.on('close', () => done(null));
            bb.on('error', () => done(null));
            req.pipe(bb);
        });
    }
}
