import { ALL_TASKS_LIST_ID, type FetchTasksArg } from '../types/tasks.types';

export class FetchTasksQueryBuilder {
    private readonly data: FetchTasksArg;
    private readonly limit: number | null = 30;
    constructor(data: FetchTasksArg, unlimited: boolean = false) {
        this.data = data;
        if (unlimited) {
            this.limit = null;
        }
    }

    getQuery() {
        let query = `select DISTINCT ON (t.id) t.*, t.start_date::text, t.end_date::text from tasks.tasks t`;
        const args: string | number | any[] = [];

        if (this.data.filters.selectedUser !== undefined && this.data.filters.selectedUser !== null) {
            query += ` 
                INNER JOIN tasks_auth.task_assignee ta ON ta.task_id = t.id 
                AND ta.collab_user_id = $${args.length + 1}`;
            args.push(this.data.filters.selectedUser);
        }

        if (this.data.filters.selectedTags) {
            const selectedTags = Object.keys(this.data.filters.selectedTags);

            if (selectedTags.length > 0) {
                query += ` 
                INNER JOIN tasks.tasks_to_tags ttt ON ttt.task_id = t.id 
                AND ttt.tag_id = ANY(string_to_array($${args.length + 1}, ',')::INT[])`;
                args.push(selectedTags.join(','));
            }
        }

        if (this.data.componentId !== ALL_TASKS_LIST_ID) {
            query += ` where t.parent_id is null and t.goal_list_id = $${args.length + 1}`;
            args.push(this.data.componentId);
        } else {
            query += ` where t.parent_id is null and t.goal_id = $${args.length + 1}`;
            args.push(this.data.goalId);
        }

        if (this.data.filters.priority !== undefined) {
            query += ` AND t.priority_id = $${args.length + 1}`;
            args.push(this.data.filters.priority);
        }

        if (this.limit !== null) {
            if (this.data.showCompleted === 0) {
                query += ` AND t.complete = $${args.length + 1}`;
                args.push(false);
            } else {
                query += ` AND t.complete = $${args.length + 1}`;
                args.push(true);
            }
        }

        if (this.data.searchText) {
            query += ` AND t.description ILIKE $${args.length + 1}`;
            args.push(`%${this.data.searchText}%`);
        }

        if (this.data.firstNew === 1) {
            query += ` ORDER BY t.id DESC`;
        } else {
            query += ` ORDER BY t.id ASC`;
        }

        if (this.limit !== null) {
            query += ` LIMIT $${args.length + 1}`;
            args.push(this.limit);

            query += ` OFFSET $${args.length + 1};`;
            if (this.data.page && this.data.page > 0) {
                args.push(this.data.page * this.limit);
            } else {
                args.push(0);
            }
        }

        return { query, args };
    }
}
