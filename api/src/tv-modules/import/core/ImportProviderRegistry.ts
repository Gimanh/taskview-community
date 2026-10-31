import type { ImportProvider } from './ImportProvider';
import { JiraCloudProvider } from '../providers/jira-cloud/JiraCloudProvider';
import { JiraDcProvider } from '../providers/jira-dc/JiraDcProvider';
import { TodoistProvider } from '../providers/todoist/TodoistProvider';
import { TrelloProvider } from '../providers/trello/TrelloProvider';

export class ImportProviderRegistry {
    private static readonly providers: Map<string, ImportProvider> = new Map(
        [new TrelloProvider(), new TodoistProvider(), new JiraCloudProvider(), new JiraDcProvider()].map((provider) => [provider.id, provider]),
    );

    static get(id: string): ImportProvider | null {
        return ImportProviderRegistry.providers.get(id) ?? null;
    }

    static all(): ImportProvider[] {
        return [...ImportProviderRegistry.providers.values()];
    }
}
