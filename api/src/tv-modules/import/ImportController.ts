import type { Request, Response } from 'express';
import { ArkErrors } from 'arktype';
import { $logger } from '../../modules/logget';
import {
    ImportArkTypeCreateJob,
    ImportArkTypeFetchJobs,
    ImportArkTypeJobId,
    ImportArkTypeProjectMeta,
    ImportArkTypeStart,
    type ImportHandleArgs,
    type ImportRespondArgs,
} from './types';

export class ImportController {
    providers = async (req: Request, res: Response) => {
        return res.tvJson(req.appUser.importManager.providers());
    };

    fetchJobs = async (req: Request, res: Response) => {
        const data = ImportArkTypeFetchJobs(req.query);
        if (data instanceof ArkErrors) return res.status(400).send(data.summary);
        return this.handle({
            res,
            action: async () => res.tvJson(await req.appUser.importManager.fetchJobs(data.organizationId)),
        });
    };

    fetchJob = async (req: Request, res: Response) => {
        const data = ImportArkTypeJobId(req.params);
        if (data instanceof ArkErrors) return res.status(400).send(data.summary);
        return this.handle({
            res,
            action: async () => {
                const job = await req.appUser.importManager.fetchJob(data.id);
                if (!job) return res.status(404).end();
                return res.tvJson(job);
            },
        });
    };

    createJob = async (req: Request, res: Response) => {
        const data = ImportArkTypeCreateJob(req.body);
        if (data instanceof ArkErrors) return res.status(400).send(data.summary);
        return this.handle({
            res,
            action: async () => this.respond({ res, result: await req.appUser.importManager.createJob(data) }),
        });
    };

    remoteProjects = async (req: Request, res: Response) => {
        const data = ImportArkTypeJobId(req.params);
        if (data instanceof ArkErrors) return res.status(400).send(data.summary);
        return this.handle({
            res,
            action: async () => this.respond({ res, result: await req.appUser.importManager.listRemoteProjects(data.id) }),
        });
    };

    projectMeta = async (req: Request, res: Response) => {
        const data = ImportArkTypeProjectMeta(req.params);
        if (data instanceof ArkErrors) return res.status(400).send(data.summary);
        return this.handle({
            res,
            action: async () => this.respond({ res, result: await req.appUser.importManager.fetchProjectMeta(data) }),
        });
    };

    start = async (req: Request, res: Response) => {
        const data = ImportArkTypeStart({ ...req.body, id: req.params.id });
        if (data instanceof ArkErrors) return res.status(400).send(data.summary);
        return this.handle({
            res,
            action: async () => this.respond({ res, result: await req.appUser.importManager.start(data) }),
        });
    };

    cancel = async (req: Request, res: Response) => {
        const data = ImportArkTypeJobId(req.params);
        if (data instanceof ArkErrors) return res.status(400).send(data.summary);
        return this.handle({
            res,
            action: async () => {
                const job = await req.appUser.importManager.cancel(data.id);
                if (!job) return res.status(409).tvJson({ code: 'not_cancellable' });
                return res.tvJson(job);
            },
        });
    };

    private respond<T>(args: ImportRespondArgs<T>) {
        if (!args.result.ok) return args.res.status(args.result.status).tvJson({ code: args.result.code });
        return args.res.tvJson(args.result.data);
    }

    private async handle(args: ImportHandleArgs) {
        try {
            return await args.action();
        } catch (err) {
            $logger.error(`[Import] request failed: ${err instanceof Error ? err.message : String(err)}`);
            return args.res.status(500).end();
        }
    }
}
