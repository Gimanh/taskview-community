import type { Request, Response } from 'express';

export class StartController {
    fetchAllLists = async (req: Request, res: Response) => {
        return res.tvJson(await req.appUser.startManager.fetchAllLists());
    };

    fetchAllState = async (req: Request, res: Response) => {
        if (!req?.query?.tz) {
            return res.status(400).send('tz is required');
        }
        return res.tvJson(await req.appUser.startManager.fetchAllState(req?.query?.tz as string));
    };

    searchTaskInAllProjects = async (req: Request, res: Response) => {
        return res.tvJson(await req.appUser.startManager.searchTaskInAllProjects(req?.query?.description as string));
    };
}
