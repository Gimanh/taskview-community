import TvApiBase from './base';
import type { AppResponse } from '@/api/base.types';
import type { Task } from './tasks.api.types';
import type { StartCalendarArgs, StartScreenState, StartStateArgs } from './start.types';

/**
 * The main screen module. Its routes sit under /module/about for historical
 * reasons, while the backend module itself is called `start`.
 */
export default class TvStartApi extends TvApiBase {
    protected moduleUrl = '/module/about';

    /**
     * One request for what the main screen shows: today, upcoming and recently
     * completed tasks across every project the caller can see. The split happens
     * on the server in `tz`, so it matches the app — a client that fetches every
     * project and compares deadlines itself gets a different answer for anyone
     * outside UTC.
     */
    public async fetchAllState(args: StartStateArgs) {
        const params = new URLSearchParams({ tz: args.tz });
        if (args.organizationId) {
            params.set('organizationId', String(args.organizationId));
        }

        return this.request(
            this.$axios.get<AppResponse<StartScreenState>>(`${this.moduleUrl}/fetchallstate?${params.toString()}`)
        );
    }

    /**
     * Top-level tasks of every project the caller can see whose dates overlap the period,
     * for the calendar on the main screen. Fields the caller may not see in a task's
     * project come back empty, the same as in that project's own calendar.
     */
    public async fetchCalendarTasks(args: StartCalendarArgs) {
        const params = new URLSearchParams({ from: args.from, to: args.to });
        if (args.organizationId) {
            params.set('organizationId', String(args.organizationId));
        }

        return this.request(this.$axios.get<AppResponse<Task[]>>(`${this.moduleUrl}/calendar?${params.toString()}`));
    }
}
