import type { Request, Response } from 'express';

export class StartController {
    fetchAllLists = async (req: Request, res: Response) => {
        const organizationId = req.query.organizationId ? Number(req.query.organizationId) : undefined;
        return res.tvJson(await req.appUser.startManager.fetchAllLists(organizationId));
    };

    fetchAllState = async (req: Request, res: Response) => {
        if (!req?.query?.tz) {
            return res.status(400).send('tz is required');
        }
        const organizationId = req.query.organizationId ? Number(req.query.organizationId) : undefined;
        return res.tvJson(await req.appUser.startManager.fetchAllState(req.query.tz as string, organizationId));
    };

    searchTaskInAllProjects = async (req: Request, res: Response) => {
        const organizationId = req.query.organizationId ? Number(req.query.organizationId) : undefined;
        return res.tvJson(await req.appUser.startManager.searchTaskInAllProjects(req?.query?.description as string, organizationId));
    };
}
