import type { NotificationMessage } from './types';
import { parseUtcTime } from './utils';

export class NotificationMessages {
    static deadline(description: string | null, endDate: string, endTime: string | null, timezone: string): NotificationMessage {
        const title = `Task: ${description || 'Task'}`;

        if (endTime) {
            const deadline = parseUtcTime(endDate, endTime);
            if (deadline) {
                const formatted = deadline.toLocaleString('en-US', {
                    timeZone: timezone,
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                    hour12: false,
                });
                return { title, body: `Deadline: ${formatted}` };
            }
        }

        return { title, body: `Deadline: ${endDate}` };
    }

    static assign(taskDescription: string | null, assignedByName: string): NotificationMessage {
        return {
            title: `Task: ${taskDescription || 'Task'}`,
            body: `Assigned to you by ${assignedByName}`,
        };
    }

    static mention(taskDescription: string | null, mentionedByName: string): NotificationMessage {
        return {
            title: `Task: ${taskDescription || 'Task'}`,
            body: `${mentionedByName} mentioned you`,
        };
    }

    static comment(taskDescription: string | null, commentByName: string): NotificationMessage {
        return {
            title: `Task: ${taskDescription || 'Task'}`,
            body: `New comment by ${commentByName}`,
        };
    }

    static statusChange(taskDescription: string | null, newStatus: string): NotificationMessage {
        return {
            title: `Task: ${taskDescription || 'Task'}`,
            body: `Status changed to ${newStatus}`,
        };
    }
}
