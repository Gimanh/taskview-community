import { type } from 'arktype';
import type { Request, Response } from 'express';
import { StartDashboardTaskPicker } from './StartDashboardTaskPicker';
import { FetchCalendarTasksArkType, FetchDashboardArkType, FetchDashboardTasksArkType } from './start.types';

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

    fetchCalendarTasks = async (req: Request, res: Response) => {
        const query = FetchCalendarTasksArkType(req.query);
        if (query instanceof type.errors) {
            return res.status(400).tvJson({ message: query.summary });
        }
        return res.tvJson(
            await req.appUser.startManager.fetchCalendarTasks({
                from: query.from,
                to: query.to,
                organizationId: query.organizationId,
            })
        );
    };

    fetchDashboard = async (req: Request, res: Response) => {
        const query = FetchDashboardArkType(req.query);
        if (query instanceof type.errors) {
            return res.status(400).tvJson({ message: query.summary });
        }
        return res.tvJson(
            await req.appUser.startManager.fetchDashboard({
                tz: query.tz,
                weekStart: query.weekStart,
                organizationId: query.organizationId,
            })
        );
    };

    fetchDashboardTasks = async (req: Request, res: Response) => {
        const query = FetchDashboardTasksArkType(req.query);
        if (query instanceof type.errors) {
            return res.status(400).tvJson({ message: query.summary });
        }
        if (query.bucket !== 'overdue' && !query.date) {
            return res.status(400).tvJson({ message: 'date is required for this column' });
        }
        return res.tvJson(
            await req.appUser.startManager.fetchDashboardTasks({
                tz: query.tz,
                bucket: query.bucket,
                date: query.date,
                offset: query.offset ?? 0,
                limit: Math.min(
                    query.limit ?? StartDashboardTaskPicker.DEFAULT_LIMIT,
                    StartDashboardTaskPicker.MAX_LIMIT
                ),
                organizationId: query.organizationId,
            })
        );
    };

    searchTaskInAllProjects = async (req: Request, res: Response) => {
        const organizationId = req.query.organizationId ? Number(req.query.organizationId) : undefined;
        return res.tvJson(
            await req.appUser.startManager.searchTaskInAllProjects(req?.query?.description as string, organizationId)
        );
    };
}
